import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { HabitFrequency } from "@prisma/client";
import { mapHabitToResponse } from "@/lib/habitUtils";
import { isValidDateOnly, parseISODateTime, toUtcStartOfDay } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const timeZone =
      req.headers.get("x-timezone") ||
      searchParams.get("timezone") ||
      searchParams.get("timeZone") ||
      "UTC";

    const frequencyParam = searchParams.get("frequency");
    const areaIdParam = searchParams.get("areaId");
    const archivedParam = searchParams.get("archived");
    const includeArchivedParam = searchParams.get("includeArchived");

    const where: any = { userId };

    if (archivedParam === "true") {
      where.archivedAt = { not: null };
    } else if (includeArchivedParam !== "true") {
      where.archivedAt = null;
    }

    if (frequencyParam) {
      const normalizedFreq = frequencyParam.toUpperCase();
      if (normalizedFreq in HabitFrequency) {
        where.frequency = normalizedFreq as HabitFrequency;
      }
    }

    if (areaIdParam) {
      where.areaId = areaIdParam === "null" ? null : areaIdParam;
    }

    const habits = await prisma.habit.findMany({
      where,
      include: {
        area: true,
        logs: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mapped = habits.map((h: any) =>
      mapHabitToResponse(h, { timeZone })
    );

    return NextResponse.json(mapped);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("write");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const body = await req.json().catch(() => ({}));
    const timeZone =
      req.headers.get("x-timezone") ||
      body.timeZone ||
      body.timezone ||
      "UTC";

    // Strict Habit Hierarchy Enforcements (Decision 09):
    // Habits can only link to an Area or remain standalone.
    // Project and SubProject assignments are strictly rejected.
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

    // Validate Name
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { error: "Habit name is required." },
        { status: 400 }
      );
    }

    // Description / Notes alias
    const description =
      typeof body.description === "string"
        ? body.description
        : typeof body.notes === "string"
        ? body.notes
        : null;

    // Validate Frequency
    const rawFreq = (body.frequency || "DAILY").toString().toUpperCase();
    if (rawFreq !== "DAILY" && rawFreq !== "WEEKLY") {
      return NextResponse.json(
        { error: "Invalid frequency. Allowed values are DAILY or WEEKLY." },
        { status: 400 }
      );
    }
    const frequency = rawFreq as HabitFrequency;

    // Validate TargetDaysPerWeek
    let targetDaysPerWeek: number | null = null;
    if (frequency === HabitFrequency.WEEKLY) {
      if (body.targetDaysPerWeek !== undefined && body.targetDaysPerWeek !== null) {
        const parsed = parseInt(body.targetDaysPerWeek, 10);
        if (isNaN(parsed) || parsed < 1 || parsed > 7) {
          return NextResponse.json(
            { error: "targetDaysPerWeek must be an integer between 1 and 7 for WEEKLY habits." },
            { status: 400 }
          );
        }
        targetDaysPerWeek = parsed;
      } else {
        targetDaysPerWeek = 3; // Default 3 days/week
      }
    }

    // Validate Area
    let areaId: string | null = body.areaId || null;
    if (!areaId && body.area) {
      const area = await prisma.area.findFirst({
        where: { name: body.area, userId },
      });
      if (!area) {
        return NextResponse.json(
          { error: "Area not found or access denied." },
          { status: 400 }
        );
      }
      areaId = area.id;
    }

    if (areaId) {
      const area = await prisma.area.findFirst({
        where: {
          userId,
          OR: [{ id: areaId }, { name: areaId }],
        },
      });
      if (!area) {
        return NextResponse.json(
          { error: "Area not found or access denied." },
          { status: 400 }
        );
      }
      areaId = area.id;
    }

    // Validate StartDate
    let startDate: Date = new Date();
    if (body.startDate) {
      if (isValidDateOnly(body.startDate)) {
        startDate = toUtcStartOfDay(body.startDate, timeZone);
      } else {
        const parsed = parseISODateTime(body.startDate);
        if (parsed) {
          startDate = parsed;
        } else {
          return NextResponse.json(
            { error: "Invalid startDate format." },
            { status: 400 }
          );
        }
      }
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        name: body.name.trim(),
        description,
        frequency,
        targetDaysPerWeek,
        startDate,
        areaId,
      },
      include: {
        area: true,
        logs: true,
      },
    });

    const mapped = mapHabitToResponse(habit, { timeZone });
    return NextResponse.json(mapped, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
