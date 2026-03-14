import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const body = await request.json();
  const key = (body?.key ?? "").trim();
  const value = (body?.value ?? "").trim();

  if (!key || !value) {
    return new NextResponse("key and value are required", { status: 400 });
  }

  const { data, error } = await supabase
    .from("items")
    .insert({ key, value, user_id: user.id })
    .select()
    .single();

  if (error) return new NextResponse(error.message, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
