import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sm2 } from "@/lib/sm2";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { q } = await req.json();
    const contentId = params.id;

    let progress = await prisma.recitationProgress.findFirst({
      where: {
        userId: session.user.id,
        contentId: contentId,
      },
    });

    if (!progress) {
      progress = await prisma.recitationProgress.create({
        data: {
          userId: session.user.id,
          contentId: contentId,
          n: 0,
          ef: 2.5,
          i: 0,
          next_recite_at: new Date(),
          last_recited_at: new Date(),
        },
      });
    }

    const { n, ef, i } = sm2(q, progress.n, progress.ef, progress.i);

    const today = new Date();
    const nextReciteAt = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);

    await prisma.recitationProgress.update({
      where: {
        id: progress.id,
      },
      data: {
        n,
        ef,
        i,
        next_recite_at: nextReciteAt,
        last_recited_at: new Date(),
      },
    });

    return new NextResponse("Recitation result submitted successfully.", { status: 200 });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
