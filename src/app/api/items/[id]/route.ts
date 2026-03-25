import { createClientForRequest } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) return new NextResponse(error.message, { status: 500 });
  return new NextResponse(null, { status: 204 });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const key = (body?.key ?? "").trim();
  const value = (body?.value ?? "").trim();

  if (!key) return new NextResponse("key is required", { status: 400 });
  if (!value) return new NextResponse("value is required", { status: 400 });

  // Check for a different item with the same key (would be a duplicate)
  const { data: existing } = await supabase
    .from("items")
    .select("id")
    .eq("user_id", user.id)
    .eq("key", key)
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    return new NextResponse("An item with this key already exists", {
      status: 409,
    });
  }

  const update: Record<string, unknown> = { key, value };

  const next_review_at = body?.next_review_at;
  if (next_review_at !== undefined && next_review_at !== null) {
    update.next_review_at = next_review_at;
  }

  const interval_days =
    body?.interval_days !== undefined ? parseInt(body.interval_days, 10) : NaN;
  if (!isNaN(interval_days)) update.interval_days = interval_days;

  const consecutive_correct =
    body?.consecutive_correct !== undefined
      ? parseInt(body.consecutive_correct, 10)
      : NaN;
  if (!isNaN(consecutive_correct))
    update.consecutive_correct = consecutive_correct;

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
