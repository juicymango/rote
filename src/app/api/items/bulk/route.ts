import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const items: unknown[] = body?.items;

  if (!Array.isArray(items) || items.length === 0) {
    return new NextResponse("items array is required and must not be empty", {
      status: 400,
    });
  }

  const rows: { key: string; value: string; user_id: string }[] = [];
  for (const item of items) {
    const key = (
      (item as Record<string, unknown>)?.key as string ?? ""
    ).trim();
    const value = (
      (item as Record<string, unknown>)?.value as string ?? ""
    ).trim();
    if (!key || !value) {
      return new NextResponse(
        "each item must have non-empty key and value",
        { status: 400 }
      );
    }
    rows.push({ key, value, user_id: user.id });
  }

  const { error, count } = await supabase
    .from("items")
    .insert(rows, { count: "exact" });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json({ count }, { status: 201 });
}
