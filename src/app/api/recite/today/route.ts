import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recitationProgress = await prisma.recitationProgress.findMany({
      where: {
        userId: user.id,
        next_recite_at: {
          lte: today,
        },
      },
      include: {
        content: true,
      },
    });

    const contentToRecite = recitationProgress.map((rp) => rp.content);

    return NextResponse.json(contentToRecite);
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
