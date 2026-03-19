import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { buildSessionPool, DEFAULT_OLD_COUNT, DEFAULT_NEW_COUNT } from "@/lib/items/sessionPool";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const url = new URL(request.url);
  const maxOld = Math.max(0, parseInt(url.searchParams.get("old") ?? String(DEFAULT_OLD_COUNT), 10) || DEFAULT_OLD_COUNT);
  const maxNew = Math.max(0, parseInt(url.searchParams.get("new") ?? String(DEFAULT_NEW_COUNT), 10) || DEFAULT_NEW_COUNT);

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return new NextResponse(error.message, { status: 500 });

  const pool = buildSessionPool(data ?? [], new Date(), maxOld, maxNew);
  return NextResponse.json(pool);
}
