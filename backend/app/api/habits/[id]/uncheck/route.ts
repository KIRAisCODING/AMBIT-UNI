import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { mapHabitToResponse } from "@/lib/habitUtils";
import { isValidDateOnly, getUserLocalToday } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const timeZone =
      req.headers.get("x-timezone") ||
      body.timeZone ||
      body.timezone ||
      "UTC";

    // Validate or resolve date
    let dateStr = body.date;
    if (dateStr) {
      if (!isValidDateOnly(dateStr)) {
        return NextResponse.json(
          { error: `Invalid date format: "${dateStr}". Expected YYYY-MM-DD.` },
          { status: 400 }
        );
      }
    } else {
      dateStr = getUserLocalToday(timeZone);
    }

    // Verify ownership
    const habit = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    // Delete log if exists
    await prisma.habitLog.deleteMany({
      where: {
        habitId: id,
        date: dateStr,
      },
    });

    const refreshedHabit = await prisma.habit.findUnique({
      where: { id },
      include: {
        area: true,
        logs: true,
      },
    });

    return NextResponse.json({
      ...mapHabitToResponse(refreshedHabit, { timeZone }),
      action: "undone",
      completed: false,
      date: dateStr,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

