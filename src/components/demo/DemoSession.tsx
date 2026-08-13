"use client";

import { useState } from "react";
import MarkdownValue from "@/components/items/MarkdownValue";
import { SAMPLE_ITEMS } from "@/lib/demo/sampleItems";

type Outcome = "remembered" | "forgot";

export default function DemoSession() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [rememberedCount, setRememberedCount] = useState(0);
  const [forgotCount, setForgotCount] = useState(0);
  const [complete, setComplete] = useState(false);

  function reset() {
    setCurrentIndex(0);
    setAnswerRevealed(false);
    setRememberedCount(0);
    setForgotCount(0);
    setComplete(false);
  }

  function handleOutcome(outcome: Outcome) {
    if (outcome === "remembered") {
      setRememberedCount((count) => count + 1);
    } else {
      setForgotCount((count) => count + 1);
    }

    if (currentIndex === SAMPLE_ITEMS.length - 1) {
      setComplete(true);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setAnswerRevealed(false);
  }

  if (complete) {
    return (
      <section
        aria-labelledby="demo-complete-heading"
        className="rounded-xl border border-green-200 bg-green-50 p-6"
      >
        <h2 id="demo-complete-heading" className="text-xl font-semibold text-green-900">
          Demo complete
        </h2>
        <p className="mt-2 text-green-800">
          You reviewed {SAMPLE_ITEMS.length} cards: {rememberedCount} remembered and {forgotCount} to revisit.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-11 rounded-md bg-white px-4 py-2 font-medium text-green-800 shadow-sm ring-1 ring-inset ring-green-300 hover:bg-green-100"
        >
          Try again
        </button>
      </section>
    );
  }

  const card = SAMPLE_ITEMS[currentIndex];

  return (
    <section aria-labelledby="demo-heading" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <h2 id="demo-heading" className="text-xl font-semibold text-gray-900">
          Try a sample review
        </h2>
        <span className="text-sm text-gray-500" aria-live="polite">
          {currentIndex + 1} / {SAMPLE_ITEMS.length}
        </span>
      </div>

      <div className="mt-6 rounded-lg bg-gray-50 p-6">
        <p className="text-lg font-semibold leading-7 text-gray-900">{card.key}</p>
        {answerRevealed && (
          <div className="mt-5 border-t border-gray-200 pt-5 text-gray-700">
            <MarkdownValue>{card.value}</MarkdownValue>
          </div>
        )}
      </div>

      {!answerRevealed ? (
        <button
          type="button"
          onClick={() => setAnswerRevealed(true)}
          className="mt-5 min-h-11 w-full rounded-md bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700"
        >
          Show answer
        </button>
      ) : (
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => handleOutcome("forgot")}
            className="min-h-11 flex-1 rounded-md border border-red-200 bg-red-50 px-4 py-3 font-medium text-red-700 hover:bg-red-100"
          >
            Forgot
          </button>
          <button
            type="button"
            onClick={() => handleOutcome("remembered")}
            className="min-h-11 flex-1 rounded-md border border-green-200 bg-green-50 px-4 py-3 font-medium text-green-700 hover:bg-green-100"
          >
            Remembered
          </button>
        </div>
      )}
    </section>
  );
}
