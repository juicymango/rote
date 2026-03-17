"use client";

import { useRouter } from "next/navigation";

interface ItemRowProps {
  id: string;
  itemKey: string;
  value: string;
  createdAt: string;
  nextReviewAt: string;
  intervalDays: number;
  consecutiveCorrect: number;
}

export default function ItemRow({
  id,
  itemKey,
  value,
  createdAt,
  nextReviewAt,
  intervalDays,
  consecutiveCorrect,
}: ItemRowProps) {
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm(`Delete "${itemKey}"?`)) return;
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    router.refresh();
  }

  function handleEdit() {
    router.push(`/items/${id}/edit`);
  }

  const valuePreview = value.length > 80 ? value.slice(0, 80) + "…" : value;

  return (
    <div className="p-4 border-b border-gray-200">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900">{itemKey}</p>
          <p className="text-sm text-gray-500 mt-1">{valuePreview}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
            <span>created: {createdAt.slice(0, 10)}</span>
            <span>next review: {nextReviewAt}</span>
            <span>interval: {intervalDays}d</span>
            <span>Streak: {consecutiveCorrect}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleEdit}
            className="px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md min-h-11"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md min-h-11"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
