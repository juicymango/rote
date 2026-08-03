"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ItemRow from "@/components/items/ItemRow";

const PAGE_SIZE = 50;

interface Item {
  id: string;
  key: string;
  value: string;
  created_at: string;
  next_review_at: string;
  interval_days: number;
  consecutive_correct: number;
}

interface ItemsResponse {
  items: Item[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const fetchItems = useCallback(async (requestedPage: number) => {
    setLoading(true);
    const res = await fetch(`/api/items?page=${requestedPage}&pageSize=${PAGE_SIZE}`);
    if (res.status === 401) {
      router.replace("/auth/login");
      setLoading(false);
      return;
    }

    if (!res.ok) {
      setItems([]);
      setTotal(0);
      setHasNext(false);
      setLoading(false);
      return;
    }

    const data = (await res.json()) as ItemsResponse;
    setItems(data.items ?? []);
    setPage(data.page);
    setTotal(data.total);
    setHasNext(data.hasNext);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(() => fetchItems(1));
  }, [fetchItems]);

  const handleDeleted = useCallback(() => {
    const targetPage = items?.length === 1 && page > 1 ? page - 1 : page;
    void fetchItems(targetPage);
  }, [fetchItems, items?.length, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Items</h1>
          <Link
            href="/session"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium min-h-11 flex items-center"
          >
            Start Session
          </Link>
        </div>

        <div className="flex gap-3 mb-6">
          <Link
            href="/items/new"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Add Item
          </Link>
          <Link
            href="/items/bulk"
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
          >
            Bulk Import
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <p className="p-8 text-center text-gray-400">Loading…</p>
          ) : !items || items.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No items yet.{" "}
              <Link href="/items/new" className="text-indigo-600 hover:underline">
                Add your first item
              </Link>
              .
            </p>
          ) : (
            items.map((item) => (
              <ItemRow
                key={item.id}
                id={item.id}
                itemKey={item.key}
                value={item.value}
                createdAt={item.created_at}
                nextReviewAt={item.next_review_at}
                intervalDays={item.interval_days}
                consecutiveCorrect={item.consecutive_correct}
                onDeleted={handleDeleted}
              />
            ))
          )}
        </div>

        {total > 0 && (
          <div className="flex items-center justify-between gap-4 mt-4">
            <p className="text-sm text-gray-500" aria-live="polite">
              Page {page} of {totalPages} · {total} items
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || page <= 1}
                onClick={() => void fetchItems(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || !hasNext}
                onClick={() => void fetchItems(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
