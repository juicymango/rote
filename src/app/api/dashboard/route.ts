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
    // Get basic statistics
    const totalContent = await prisma.content.count({
      where: {
        userId: user.id,
      },
    });

    const totalProgress = await prisma.recitationProgress.count({
      where: {
        userId: user.id,
      },
    });

    // Get content due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueToday = await prisma.recitationProgress.count({
      where: {
        userId: user.id,
        next_recite_at: {
          lte: today,
        },
      },
    });

    // Get detailed progress information
    const progress = await prisma.recitationProgress.findMany({
      where: {
        userId: user.id,
      },
      include: {
        content: true,
      },
      orderBy: {
        last_recited_at: "desc",
      },
    });

    // Calculate statistics
    const numRecitations = progress.length;
    const avgEf =
      numRecitations > 0
        ? progress.reduce((acc, p) => acc + p.ef, 0) / numRecitations
        : 0;

    // Get content due in next 7 days
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const dueNextWeek = await prisma.recitationProgress.findMany({
      where: {
        userId: user.id,
        next_recite_at: {
          gt: today,
          lte: nextWeek,
        },
      },
      include: {
        content: true,
      },
      orderBy: {
        next_recite_at: "asc",
      },
    });

    // Calculate proficiency levels
    const proficiencyLevels = {
      beginner: progress.filter((p) => p.n < 3).length,
      intermediate: progress.filter((p) => p.n >= 3 && p.n < 7).length,
      advanced: progress.filter((p) => p.n >= 7).length,
    };

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = progress.filter(
      (p) => p.last_recited_at >= sevenDaysAgo
    );

    return NextResponse.json({
      stats: {
        totalContent,
        totalProgress,
        dueToday,
        avgEf: Math.round(avgEf * 100) / 100,
        recentActivityCount: recentActivity.length,
        proficiencyLevels,
      },
      progress,
      dueNextWeek,
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
