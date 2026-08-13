import { createClientForRequest } from "@/lib/supabase/server";
import { isEventName } from "@/lib/telemetry/events";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const eventName = (body as { event_name?: unknown } | null)?.event_name;
  if (!isEventName(eventName)) {
    return new NextResponse("event_name is invalid", { status: 400 });
  }

  const { error } = await supabase.from("user_events").insert({
    user_id: user.id,
    event_name: eventName,
  });

  if (error) return new NextResponse(error.message, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
