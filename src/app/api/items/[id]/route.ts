import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) return new NextResponse(error.message, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
