import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { mergeValues } from "@/lib/items/mergeValues";

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

  const incoming: { key: string; value: string }[] = [];
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
    incoming.push({ key, value });
  }

  // Fetch existing items for this user to detect duplicates
  const { data: existingItems, error: fetchError } = await supabase
    .from("items")
    .select("id, key, value")
    .eq("user_id", user.id);

  if (fetchError) return new NextResponse(fetchError.message, { status: 500 });

  const existingMap = new Map<string, { id: string; value: string }>();
  for (const existing of existingItems ?? []) {
    existingMap.set(existing.key, { id: existing.id, value: existing.value });
  }

  const toInsert: { key: string; value: string; user_id: string }[] = [];
  const toUpdate: { id: string; value: string }[] = [];

  for (const item of incoming) {
    const found = existingMap.get(item.key);
    if (found) {
      toUpdate.push({ id: found.id, value: mergeValues(item.value, found.value) });
    } else {
      toInsert.push({ key: item.key, value: item.value, user_id: user.id });
    }
  }

  const ops: Promise<unknown>[] = [];

  if (toInsert.length > 0) {
    ops.push(
      supabase
        .from("items")
        .insert(toInsert, { count: "exact" })
        .then(({ error }) => {
          if (error) throw error;
        })
    );
  }

  for (const upd of toUpdate) {
    ops.push(
      supabase
        .from("items")
        .update({ value: upd.value })
        .eq("id", upd.id)
        .then(({ error }) => {
          if (error) throw error;
        })
    );
  }

  try {
    await Promise.all(ops);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "database error";
    return new NextResponse(msg, { status: 500 });
  }

  return NextResponse.json(
    { count: toInsert.length + toUpdate.length },
    { status: 201 }
  );
}
