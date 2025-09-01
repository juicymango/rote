import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const progress = await prisma.recitationProgress.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        content: true,
      },
    });

    const numContents = await prisma.content.count({
      where: {
        userId: session.user.id,
      },
    });

    const numRecitations = progress.length;

    const avgEf = numRecitations > 0
      ? progress.reduce((acc, p) => acc + p.ef, 0) / numRecitations
      : 0;

    return NextResponse.json({
      numContents,
      numRecitations,
      avgEf,
      progress,
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
