import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const refresh_token = (body?.refresh_token ?? "").trim();

  if (!refresh_token) {
    return NextResponse.json({ error: "refresh_token is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.refreshSession({ refresh_token });

  if (error || !data.session) {
    return NextResponse.json(
      { error: error?.message ?? "Token refresh failed" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
  });
}
