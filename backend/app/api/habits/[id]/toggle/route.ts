import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { mapHabitToResponse } from "@/lib/habitUtils";
import { isValidDateOnly, getUserLocalToday } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

async function handleToggle(
  req: Request,
  paramsPromise: Promise<{ id: string }>
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await paramsPromise;

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
      include: {
        area: true,
        logs: true,
      },
    });

    if (!habit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const existingLog = habit.logs.find((l) => l.date === dateStr);
    let action = "checked_in";
    let completed = true;

    if (existingLog) {
      await prisma.habitLog.delete({
        where: { id: existingLog.id },
      });
      action = "undone";
      completed = false;
    } else {
      await prisma.habitLog.create({
        data: {
          habitId: id,
          userId,
          date: dateStr,
          completedAt: new Date(),
        },
      });
    }

    const refreshedHabit = await prisma.habit.findUnique({
      where: { id },
      include: {
        area: true,
        logs: true,
      },
    });

    return NextResponse.json({
      ...mapHabitToResponse(refreshedHabit, { timeZone }),
      action,
      completed,
      date: dateStr,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleToggle(req, params);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleToggle(req, params);
}
