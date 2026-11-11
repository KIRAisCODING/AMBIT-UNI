import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { HabitFrequency } from "@prisma/client";
import { mapHabitToResponse } from "@/lib/habitUtils";
import { isValidDateOnly, parseISODateTime, toUtcStartOfDay } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const { searchParams } = new URL(req.url);
    const timeZone =
      req.headers.get("x-timezone") ||
      searchParams.get("timezone") ||
      searchParams.get("timeZone") ||
      "UTC";

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

    return NextResponse.json(mapHabitToResponse(habit, { timeZone }));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const existingHabit = await prisma.habit.findFirst({
      where: { id, userId },
      include: { area: true, logs: true },
    });

    if (!existingHabit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const timeZone =
      req.headers.get("x-timezone") ||
      body.timeZone ||
      body.timezone ||
      "UTC";

    // Strict Habit Hierarchy Enforcements (Decision 09)
    if (
      body.projectId !== undefined && body.projectId !== null ||
      body.subProjectId !== undefined && body.subProjectId !== null ||
      body.project ||
      body.subProject
    ) {
      return NextResponse.json(
        {
          error:
            "Habits can only be assigned to an Area or remain standalone. Linking habits to Projects or SubProjects is not permitted.",
        },
        { status: 400 }
      );
    }

    const updateData: any = {};

    // Name update
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { error: "Habit name cannot be empty." },
          { status: 400 }
        );
      }
      updateData.name = body.name.trim();
    }

    // Description / Notes update
    if (body.description !== undefined) {
      updateData.description = body.description || null;
    } else if (body.notes !== undefined) {
      updateData.description = body.notes || null;
    }

    // Frequency & targetDaysPerWeek update
    let targetFrequency = existingHabit.frequency;
    if (body.frequency !== undefined) {
      const rawFreq = body.frequency.toString().toUpperCase();
      if (rawFreq !== "DAILY" && rawFreq !== "WEEKLY") {
        return NextResponse.json(
          { error: "Invalid frequency. Allowed values are DAILY or WEEKLY." },
          { status: 400 }
        );
      }
      targetFrequency = rawFreq as HabitFrequency;
      updateData.frequency = targetFrequency;
    }

    if (targetFrequency === HabitFrequency.WEEKLY) {
      if (body.targetDaysPerWeek !== undefined) {
        const parsed = parseInt(body.targetDaysPerWeek, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 7) {
          return NextResponse.json(
            { error: "targetDaysPerWeek must be an integer between 1 and 7 for WEEKLY habits." },
            { status: 400 }
          );
        }
        updateData.targetDaysPerWeek = parsed;
      } else if (!existingHabit.targetDaysPerWeek) {
        updateData.targetDaysPerWeek = 3;
      }
    } else if (targetFrequency === HabitFrequency.DAILY) {
      updateData.targetDaysPerWeek = null;
    }

    // Area update
    if (body.areaId !== undefined) {
      if (body.areaId === null || body.areaId === "" || body.areaId === "null") {
        updateData.areaId = null;
      } else {
        const area = await prisma.area.findFirst({
          where: { id: body.areaId, userId },
        });
        if (!area) {
          return NextResponse.json(
            { error: "Area not found or access denied." },
            { status: 400 }
          );
        }
        updateData.areaId = area.id;
      }
    } else if (body.area !== undefined) {
      if (body.area === null || body.area === "" || body.area === "null") {
        updateData.areaId = null;
      } else {
        const area = await prisma.area.findFirst({
          where: { name: body.area, userId },
        });
        if (!area) {
          return NextResponse.json(
            { error: "Area not found or access denied." },
            { status: 400 }
          );
        }
        updateData.areaId = area.id;
      }
    }

    // StartDate update
    if (body.startDate !== undefined) {
      if (isValidDateOnly(body.startDate)) {
        updateData.startDate = toUtcStartOfDay(body.startDate, timeZone);
      } else {
        const parsed = parseISODateTime(body.startDate);
        if (parsed) {
          updateData.startDate = parsed;
        } else {
          return NextResponse.json(
            { error: "Invalid startDate format." },
            { status: 400 }
          );
        }
      }
    }

    // Archived update
    if (body.archived !== undefined) {
      updateData.archivedAt = body.archived ? new Date() : null;
    }

    const updatedHabit = await prisma.habit.update({
      where: { id },
      data: updateData,
      include: {
        area: true,
        logs: true,
      },
    });

    return NextResponse.json(mapHabitToResponse(updatedHabit, { timeZone }));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;
    const { id } = await params;

    const existingHabit = await prisma.habit.findFirst({
      where: { id, userId },
    });

    if (!existingHabit) {
      return NextResponse.json({ error: "Habit not found" }, { status: 404 });
    }

    await prisma.habit.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
