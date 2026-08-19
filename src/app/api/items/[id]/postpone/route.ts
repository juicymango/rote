import { createClientForRequest } from "@/lib/supabase/server";
import { addPostponeDays, parsePostponeDays } from "@/lib/items/postpone";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  let parsedBody: unknown = {};
  try {
    parsedBody = await request.json();
  } catch {
    // An empty body uses the default postponement period.
  }

  const body =
    parsedBody && typeof parsedBody === "object"
      ? (parsedBody as { days?: unknown })
      : {};

  const days = parsePostponeDays(body.days);
  if (days === null) {
    return new NextResponse("days must be an integer between 1 and 365", {
      status: 400,
    });
  }

  const { id } = await params;
  const { data: item, error: findError } = await supabase
    .from("items")
    .select("id, key, value, next_review_at, interval_days, consecutive_correct, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (findError) return new NextResponse(findError.message, { status: 500 });
  if (!item) return new NextResponse("Item not found", { status: 404 });

  const update = {
    next_review_at: addPostponeDays(new Date(), days),
    // A postponed new card moves into the old-card pool. Existing old cards
    // retain their learning history and only receive a new review date.
    ...(item.consecutive_correct === 0 ? { consecutive_correct: 1 } : {}),
  };

  const { data, error } = await supabase
    .from("items")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data);
}
