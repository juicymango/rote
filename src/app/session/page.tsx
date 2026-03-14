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
  const [flipped, setFlipped] = useState(false);
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

  function handleAnswer(outcome: CardOutcome) {
    if (pool.length === 0) return;
    const card = pool[currentIndex];

    // Update session correct count
    const newCorrect = new Map(sessionCorrect);
    const prev = newCorrect.get(card.id) ?? 0;
    const nextCorrect = outcome === "remembered" ? prev + 1 : 0;
    newCorrect.set(card.id, nextCorrect);
    setSessionCorrect(newCorrect);

    // Update results map (last outcome wins)
    const newResults = new Map(results);
    newResults.set(card.id, {
      id: card.id,
      outcome,
      interval_days: card.interval_days,
      consecutive_correct: card.consecutive_correct,
    });
    setResults(newResults);

    // Check graduation
    let newPool = [...pool];
    let newPending = [...pending];
    let graduated = false;

    if (outcome === "remembered" && nextCorrect >= GRADUATION_COUNT) {
      // Graduate this card
      newPool = pool.filter((_, i) => i !== currentIndex);
      // Promote next pending card if available
      if (newPending.length > 0) {
        const [next, ...rest] = newPending;
        newPool = [...newPool, next];
        newPending = rest;
      }
      graduated = true;
    }

    if (newPool.length === 0) {
      setPool(newPool);
      setPending(newPending);
      finishSession(newResults);
      return;
    }

    // Pick next card
    const nextIndex = pickNext(
      newPool,
      graduated ? null : card.id
    );

    setPool(newPool);
    setPending(newPending);
    setPrevId(card.id);
    setCurrentIndex(nextIndex);
    setFlipped(false);
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
        <div
          role="button"
          tabIndex={0}
          onClick={() => setFlipped(true)}
          onKeyDown={(e) => e.key === "Enter" && setFlipped(true)}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6 cursor-pointer min-h-11 text-center"
          aria-label="flip card"
        >
          <p className="text-xl font-semibold text-gray-900 mb-4">{card.key}</p>
          {flipped ? (
            <div className="prose prose-sm max-w-none text-left border-t border-gray-100 pt-4">
              <ReactMarkdown>{card.value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Tap to reveal</p>
          )}
        </div>

        {flipped && (
          <div className="flex gap-4">
            <button
              onClick={() => handleAnswer("forgot")}
              className="flex-1 py-3 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 font-medium min-h-11"
            >
              Forgot
            </button>
            <button
              onClick={() => handleAnswer("remembered")}
              className="flex-1 py-3 bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 font-medium min-h-11"
            >
              Remembered
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
