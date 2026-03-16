"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Item } from "@/lib/items/sessionPool";
import { CardOutcome } from "@/lib/items/spacedRepetition";

interface ResultEntry {
  id: string;
  outcome: CardOutcome;
  interval_days: number;
  consecutive_correct: number;
}

type Phase = "loading" | "empty" | "review" | "complete";

const GRADUATION_COUNT = 3;

function pickNext(pool: Item[], excludeId: string | null): number {
  if (pool.length === 0) return -1;
  if (pool.length === 1) return 0;
  const candidates = pool
    .map((_, i) => i)
    .filter((i) => pool[i].id !== excludeId);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default function SessionPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [pool, setPool] = useState<Item[]>([]);
  const [pending, setPending] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prevId, setPrevId] = useState<string | null>(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [saving, setSaving] = useState(false);
  // consecutive correct count within this session per card id
  const [sessionCorrect, setSessionCorrect] = useState<Map<string, number>>(new Map());
  // final outcome per card for persisting at session end
  const [results, setResults] = useState<Map<string, ResultEntry>>(new Map());

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/session");
        if (!res.ok) {
          setPhase("empty");
          return;
        }
        const data: Item[] = await res.json();
        if (data.length === 0) {
          setPhase("empty");
          return;
        }
        // Split into initial pool (up to 20) and any pending remainder
        const initialPool = data.slice(0, 20);
        const initialPending = data.slice(20);
        setPool(initialPool);
        setPending(initialPending);
        setCurrentIndex(Math.floor(Math.random() * initialPool.length));
        setPhase("review");
      } catch {
        setPhase("empty");
      }
    }
    loadSession();
  }, []);

  const finishSession = useCallback(
    async (finalResults: Map<string, ResultEntry>) => {
      setPhase("complete");
      if (finalResults.size === 0) return;
      await fetch("/api/session/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: Array.from(finalResults.values()) }),
      });
    },
    []
  );

  function advanceCard(
    newPool: Item[],
    newPending: Item[],
    newResults: Map<string, ResultEntry>,
    cardId: string,
    graduated: boolean
  ) {
    if (newPool.length === 0) {
      setPool(newPool);
      setPending(newPending);
      finishSession(newResults);
      return;
    }
    const nextIndex = pickNext(newPool, graduated ? null : cardId);
    setPool(newPool);
    setPending(newPending);
    setPrevId(cardId);
    setCurrentIndex(nextIndex);
    setAnswerRevealed(false);
    setEditing(false);
  }

  function handleShowAnswer() {
    setAnswerRevealed(true);
  }

  function handleEdit() {
    if (pool.length === 0) return;
    const card = pool[currentIndex];
    setEditedValue(card.value);
    setEditing(true);
  }

  function handleCancelEdit() {
    setEditing(false);
    setEditedValue("");
  }

  async function handleSaveEdit() {
    if (pool.length === 0) return;
    const card = pool[currentIndex];
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${card.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: card.key, value: editedValue }),
      });
      if (!res.ok) {
        alert("Failed to save changes");
        return;
      }
      // Update the local pool with the new value
      const newPool = [...pool];
      newPool[currentIndex] = { ...card, value: editedValue };
      setPool(newPool);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleRemembered() {
    if (pool.length === 0) return;
    const card = pool[currentIndex];

    const newCorrect = new Map(sessionCorrect);
    const prev = newCorrect.get(card.id) ?? 0;
    const nextCorrect = prev + 1;
    newCorrect.set(card.id, nextCorrect);
    setSessionCorrect(newCorrect);

    const newResults = new Map(results);
    newResults.set(card.id, {
      id: card.id,
      outcome: "remembered",
      interval_days: card.interval_days,
      consecutive_correct: card.consecutive_correct,
    });
    setResults(newResults);

    let newPool = [...pool];
    let newPending = [...pending];
    let graduated = false;

    if (nextCorrect >= GRADUATION_COUNT) {
      newPool = pool.filter((_, i) => i !== currentIndex);
      if (newPending.length > 0) {
        const [next, ...rest] = newPending;
        newPool = [...newPool, next];
        newPending = rest;
      }
      graduated = true;
    }

    advanceCard(newPool, newPending, newResults, card.id, graduated);
  }

  function handleForgot() {
    if (pool.length === 0) return;
    const card = pool[currentIndex];

    const newCorrect = new Map(sessionCorrect);
    newCorrect.set(card.id, 0);
    setSessionCorrect(newCorrect);

    const newResults = new Map(results);
    newResults.set(card.id, {
      id: card.id,
      outcome: "forgot",
      interval_days: card.interval_days,
      consecutive_correct: card.consecutive_correct,
    });
    setResults(newResults);

    // Advance to next card immediately (no Next button needed)
    advanceCard([...pool], [...pending], newResults, card.id, false);
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading session...</p>
      </div>
    );
  }

  if (phase === "empty") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No cards due</h1>
          <p className="text-gray-600 mb-6">
            You have no cards due for review. Add more items or come back later.
          </p>
          <Link
            href="/items"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            Go to Items
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Session Complete!</h1>
          <p className="text-gray-600 mb-6">
            You reviewed {results.size} card{results.size !== 1 ? "s" : ""}.
          </p>
          <Link
            href="/items"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            Back to Items
          </Link>
        </div>
      </div>
    );
  }

  const card = pool[currentIndex];
  if (!card) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-gray-500">
            {pool.length} card{pool.length !== 1 ? "s" : ""} remaining
          </span>
          <button
            onClick={() => finishSession(results)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            End session
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <p className="text-xl font-semibold text-gray-900 mb-4">{card.key}</p>
          {answerRevealed && (
            <>
              {/* Action buttons above the value */}
              <div className="flex gap-4 mb-4">
                <button
                  onClick={handleForgot}
                  disabled={editing}
                  className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 font-medium min-h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Forgot
                </button>
                <button
                  onClick={handleRemembered}
                  disabled={editing}
                  className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 font-medium min-h-11 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remembered
                </button>
              </div>
              <div className="border-t border-gray-100 pt-4">
                {editing ? (
                  <div className="space-y-3">
                    <textarea
                      value={editedValue}
                      onChange={(e) => setEditedValue(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium disabled:opacity-50"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prose prose-sm max-w-none text-left mb-3">
                      <ReactMarkdown>{card.value}</ReactMarkdown>
                    </div>
                    <button
                      onClick={handleEdit}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      Edit value
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {!answerRevealed && (
          <button
            onClick={handleShowAnswer}
            className="w-full py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium min-h-11"
          >
            Show Answer
          </button>
        )}
      </div>
    </div>
  );
}
