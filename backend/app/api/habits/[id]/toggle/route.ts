import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;
    
    // Verify ownership
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    
    // Default to today's date in local server YYYY-MM-DD
    const dateStr = body.date || new Date().toISOString().split("T")[0];

    let completedDays = [...habit.completedDays];
    const isAlreadyCompleted = completedDays.includes(dateStr);

    if (isAlreadyCompleted) {
      completedDays = completedDays.filter((d) => d !== dateStr);
    } else {
      completedDays.push(dateStr);
    }

    // Sort dates
    completedDays.sort();

    // Calculate streak
    let streak = 0;
    const datesSet = new Set(completedDays);
    const checkDate = new Date();

    // If today is completed, trace backwards
    const todayStr = checkDate.toISOString().split("T")[0];
    if (datesSet.has(todayStr)) {
      while (datesSet.has(checkDate.toISOString().split("T")[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    } else {
      // If today is not completed, check if yesterday was to preserve active streak
      checkDate.setDate(checkDate.getDate() - 1);
      if (datesSet.has(checkDate.toISOString().split("T")[0])) {
        while (datesSet.has(checkDate.toISOString().split("T")[0])) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }
    }

    // Longest streak calculation
    const longestStreak = Math.max(habit.longestStreak, streak);

    const updatedHabit = await prisma.habit.update({
      where: { id },
      data: {
        completedDays,
        streak,
        longestStreak,
      },
    });

    return NextResponse.json(updatedHabit);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
