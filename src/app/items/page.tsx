"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ItemRow from "@/components/items/ItemRow";

interface Item {
  id: string;
  key: string;
  value: string;
  created_at: string;
  next_review_at: string;
  interval_days: number;
  consecutive_correct: number;
}

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/items");
    if (res.status === 401) {
      router.replace("/auth/login");
      return;
    }
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        fetchItems();
      }
    });
  }, [router, fetchItems]);

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
                onDeleted={fetchItems}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
