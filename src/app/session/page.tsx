"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { Item } from "@/lib/items/sessionPool";
import { CardOutcome, computeIntervalUpdate } from "@/lib/items/spacedRepetition";

interface ResultEntry {
  id: string;
  outcome: CardOutcome;
  interval_days: number;
  consecutive_correct: number;
  next_review_at_override?: string;
  is_first_forgot?: boolean;
}

interface ReviewedToday {
  id: string;
  key: string;
  outcome: "remembered" | "forgot";
}

type Phase = "setup" | "loading" | "empty" | "review" | "confirm" | "complete";

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
  const [phase, setPhase] = useState<Phase>("setup");
  const [maxOld, setMaxOld] = useState(10);
  const [maxNew, setMaxNew] = useState(10);
  const [pool, setPool] = useState<Item[]>([]);
  const [pending, setPending] = useState<Item[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editedValue, setEditedValue] = useState("");
  const [saving, setSaving] = useState(false);
  // consecutive correct count within this session per card id
  const [sessionCorrect, setSessionCorrect] = useState<Map<string, number>>(new Map());
  // tracks how many times each card has been forgotten in this session
  const [sessionForgotCount, setSessionForgotCount] = useState<Map<string, number>>(new Map());
  // final outcome per card for persisting at session end
  const [results, setResults] = useState<Map<string, ResultEntry>>(new Map());
  // today's reviewed list (fetched once on session start)
  const [reviewedToday, setReviewedToday] = useState<ReviewedToday[]>([]);
  // status panel visibility
  const [showStatus, setShowStatus] = useState(false);
  // confirmation screen: map of card id to next_review_at override
  const [nextReviewOverrides, setNextReviewOverrides] = useState<Map<string, string>>(new Map());
  // all cards loaded for this session (used to look up keys on confirm screen)
  const [allSessionCards, setAllSessionCards] = useState<Map<string, Item>>(new Map());

  useEffect(() => {
    if (phase !== "loading") return;
    async function loadSession() {
      try {
        const res = await fetch(`/api/session?old=${maxOld}&new=${maxNew}`);
        if (!res.ok) {
          setPhase("empty");
          return;
        }
        const data: Item[] = await res.json();
        if (data.length === 0) {
          setPhase("empty");
          return;
        }
        // Split into initial pool (up to maxOld+maxNew) and any pending remainder
        const initialPool = data.slice(0, maxOld + maxNew);
        const initialPending = data.slice(maxOld + maxNew);
        setPool(initialPool);
        setPending(initialPending);
        setAllSessionCards(new Map(data.map((item) => [item.id, item])));
        setCurrentIndex(Math.floor(Math.random() * initialPool.length));
        setPhase("review");
      } catch {
        setPhase("empty");
      }
    }
    loadSession();
  }, [phase, maxOld, maxNew]);

  const finishSession = useCallback(
    (finalResults: Map<string, ResultEntry>) => {
      if (finalResults.size === 0) {
        setPhase("complete");
        return;
      }
      // Pre-populate overrides with algorithm-computed dates so the client-computed
      // date is always sent to the server, preventing timezone drift between client
      // and server recomputation.
      const today = new Date();
      const initialOverrides = new Map<string, string>();
      for (const entry of finalResults.values()) {
        const { next_review_at } = computeIntervalUpdate(
          { interval_days: entry.interval_days, consecutive_correct: entry.consecutive_correct },
          entry.outcome,
          today,
          entry.is_first_forgot
        );
        initialOverrides.set(entry.id, next_review_at);
      }
      setNextReviewOverrides(initialOverrides);
      setPhase("confirm");
    },
    []
  );

  const confirmAndPersist = useCallback(async () => {
    setPhase("complete");
    if (results.size === 0) return;

    // Apply overrides to results
    const finalResults = Array.from(results.values()).map((entry) => {
      const override = nextReviewOverrides.get(entry.id);
      return override ? { ...entry, next_review_at_override: override } : entry;
    });

    await fetch("/api/session/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ results: finalResults }),
    });
  }, [results, nextReviewOverrides]);

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

    // Track how many times this card has been forgotten in this session
    const newForgotCount = new Map(sessionForgotCount);
    const prevForgotCount = newForgotCount.get(card.id) ?? 0;
    const isFirstForgot = prevForgotCount === 0;
    newForgotCount.set(card.id, prevForgotCount + 1);
    setSessionForgotCount(newForgotCount);

    const newResults = new Map(results);
    newResults.set(card.id, {
      id: card.id,
      outcome: "forgot",
      interval_days: card.interval_days,
      consecutive_correct: card.consecutive_correct,
      is_first_forgot: isFirstForgot,
    });
    setResults(newResults);

    // Advance to next card immediately (no Next button needed)
    advanceCard([...pool], [...pending], newResults, card.id, false);
  }

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Start Session</h1>
          <div className="space-y-4 mb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Old cards (due for review)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={maxOld}
                onChange={(e) => setMaxOld(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New cards
              </label>
              <input
                type="number"
                min={0}
                max={50}
                value={maxNew}
                onChange={(e) => setMaxNew(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
          <button
            onClick={() => setPhase("loading")}
            className="w-full py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            Start Session
          </button>
        </div>
      </div>
    );
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

  if (phase === "confirm") {
    const today = new Date();
    const cardsToConfirm = Array.from(results.values()).map((entry) => {
      const sessionCard = allSessionCards.get(entry.id);
      const algorithmDate = computeIntervalUpdate(
        { interval_days: entry.interval_days, consecutive_correct: entry.consecutive_correct },
        entry.outcome,
        today,
        entry.is_first_forgot
      ).next_review_at;
      const override = nextReviewOverrides.get(entry.id);

      return {
        id: entry.id,
        key: sessionCard?.key ?? entry.id,
        outcome: entry.outcome,
        algorithmDate,
        selectedDate: override || algorithmDate,
      };
    });

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Confirm Review Schedule</h1>
          <p className="text-gray-600 mb-6">
            Review the next review dates below. You can adjust individual cards or confirm to save.
          </p>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            {cardsToConfirm.map((card) => (
              <div key={card.id} className="p-4 border-b border-gray-200 last:border-b-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{card.key}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Outcome: {card.outcome === "remembered" ? "Remembered" : "Forgot"}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <label className="block text-xs text-gray-500 mb-1">Next review</label>
                    <input
                      type="date"
                      value={card.selectedDate}
                      onChange={(e) => {
                        const newOverrides = new Map(nextReviewOverrides);
                        newOverrides.set(card.id, e.target.value);
                        setNextReviewOverrides(newOverrides);
                      }}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={confirmAndPersist}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
            >
              Confirm and Save
            </button>
            <button
              onClick={confirmAndPersist}
              className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
            >
              Use Defaults
            </button>
          </div>
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

  // Calculate status panel data
  const rememberedCount = Array.from(results.values()).filter(
    (r) => r.outcome === "remembered"
  ).length;

  const initialPoolIds = new Set([...pool, ...pending].map((c) => c.id));
  const currentPoolStatus = [...pool, ...pending]
    .filter((c) => initialPoolIds.has(c.id))
    .map((c) => {
      const result = results.get(c.id);
      const status = result
        ? result.outcome === "remembered"
          ? "remembered"
          : "forgot"
        : "pending";
      return { id: c.id, key: c.key, status };
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm text-gray-500">
            {pool.length} card{pool.length !== 1 ? "s" : ""} remaining
          </span>
          <div className="flex gap-4">
            <button
              onClick={() => setShowStatus(!showStatus)}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              {showStatus ? "Hide" : "Show"} Status
            </button>
            <button
              onClick={() => finishSession(results)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              End session
            </button>
          </div>
        </div>

        {/* Status Panel */}
        {showStatus && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Status</h2>

            {/* Remembered count */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Remembered this session</p>
              <p className="text-2xl font-bold text-green-600">{rememberedCount}</p>
            </div>

            {/* Current pool */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Current pool</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {currentPoolStatus.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                  >
                    <span className="truncate flex-1">{item.key}</span>
                    <span
                      className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                        item.status === "remembered"
                          ? "bg-green-100 text-green-700"
                          : item.status === "forgot"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's reviewed list */}
            {reviewedToday.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Reviewed earlier today</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {reviewedToday.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                    >
                      <span className="truncate flex-1">{item.key}</span>
                      <span
                        className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                          item.outcome === "remembered"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.outcome}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
