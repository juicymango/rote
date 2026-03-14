import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { buildSessionPool } from "@/lib/items/sessionPool";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return new NextResponse(error.message, { status: 500 });

  const pool = buildSessionPool(data ?? []);
  return NextResponse.json(pool);
}
