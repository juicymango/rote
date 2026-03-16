"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

interface Item {
  id: string;
  key: string;
  value: string;
  next_review_at: string;
  interval_days: number;
  consecutive_correct: number;
}

interface EditItemFormProps {
  item: Item;
}

export default function EditItemForm({ item }: EditItemFormProps) {
  const router = useRouter();
  const [key, setKey] = useState(item.key);
  const [value, setValue] = useState(item.value);
  const [nextReviewAt, setNextReviewAt] = useState(item.next_review_at);
  const [intervalDays, setIntervalDays] = useState(String(item.interval_days));
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(
    String(item.consecutive_correct)
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!key.trim()) {
      setError("Key is required.");
      return;
    }
    if (!value.trim()) {
      setError("Value is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim(),
          value: value.trim(),
          next_review_at: nextReviewAt,
          interval_days: parseInt(intervalDays, 10),
          consecutive_correct: parseInt(consecutiveCorrect, 10),
        }),
      });
      if (res.status === 409) {
        setError("A card with this key already exists.");
        return;
      }
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Failed to update item.");
        return;
      }
      router.push("/items");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/items" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Item</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4"
        >
          {error && (
            <p className="text-red-600 text-sm" role="alert">
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="key"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Key
            </label>
            <input
              id="key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="value"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Value (Markdown)
            </label>
            <textarea
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
            />
          </div>

          {value && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Preview</p>
              <div className="prose prose-sm max-w-none p-3 border border-gray-200 rounded-md bg-gray-50">
                <ReactMarkdown>{value}</ReactMarkdown>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="next_review_at"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Next Review
              </label>
              <input
                id="next_review_at"
                type="date"
                value={nextReviewAt}
                onChange={(e) => setNextReviewAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="interval_days"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Interval (days)
              </label>
              <input
                id="interval_days"
                type="number"
                min="1"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label
                htmlFor="consecutive_correct"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Streak
              </label>
              <input
                id="consecutive_correct"
                type="number"
                min="0"
                value={consecutiveCorrect}
                onChange={(e) => setConsecutiveCorrect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-11"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
