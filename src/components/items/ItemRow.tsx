"use client";

import { useRouter } from "next/navigation";

interface ItemRowProps {
  id: string;
  itemKey: string;
  valuePreview: string;
}

export default function ItemRow({ id, itemKey, valuePreview }: ItemRowProps) {
  const router = useRouter();

  async function handleDelete() {
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{itemKey}</p>
        <p className="text-sm text-gray-500 truncate">{valuePreview}</p>
      </div>
      <button
        onClick={handleDelete}
        className="ml-4 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md min-h-11"
      >
        Delete
      </button>
    </div>
  );
}
