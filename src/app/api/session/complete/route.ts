import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { computeIntervalUpdate, CardOutcome } from "@/lib/items/spacedRepetition";

interface ResultEntry {
  id: string;
  outcome: CardOutcome;
  interval_days: number;
  consecutive_correct: number;
  next_review_at_override?: string; // Optional per-card override for next_review_at
  is_first_forgot?: boolean; // Whether this was the first forget in the session
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const results: unknown[] = body?.results;

  if (!Array.isArray(results) || results.length === 0) {
    return new NextResponse("results array is required", { status: 400 });
  }

  const today = new Date();
  const updates: Promise<void>[] = [];

  for (const entry of results) {
    const { id, outcome, interval_days, consecutive_correct, next_review_at_override, is_first_forgot } =
      entry as ResultEntry;
    const update = computeIntervalUpdate(
      { interval_days, consecutive_correct },
      outcome,
      today,
      is_first_forgot
    );

    // Use override if provided, otherwise use algorithm-computed date
    const finalNextReviewAt = next_review_at_override ?? update.next_review_at;

    updates.push(
      Promise.resolve(
        supabase
          .from("items")
          .update({
            interval_days: update.interval_days,
            next_review_at: finalNextReviewAt,
            consecutive_correct: update.consecutive_correct,
          })
          .eq("id", id)
          .eq("user_id", user.id)
      ).then(({ error }) => {
        if (error) throw error;
      })
    );
  }

  try {
    await Promise.all(updates);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "database error";
    return new NextResponse(message, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}
