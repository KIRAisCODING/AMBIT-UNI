import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { TaskStatus } from "@prisma/client";
import {
  isValidDateOnly,
  getUserLocalToday,
  toUtcStartOfDay,
  toUtcEndOfDay,
  addDaysToDateOnly,
} from "@/lib/dateUtils";
import { mapHabitToResponse } from "@/lib/habitUtils";
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

    // Date range resolution
    const todayStr = getUserLocalToday(timeZone);
    let startParam = searchParams.get("start");
    let endParam = searchParams.get("end");

    if (!startParam || !endParam) {
      // Default to 42-day calendar month grid view around today
      const [yearStr, monthStr] = todayStr.split("-");
      startParam = `${yearStr}-${monthStr}-01`;
      endParam = addDaysToDateOnly(startParam, 41);
    }

    if (!isValidDateOnly(startParam) || !isValidDateOnly(endParam)) {
      return NextResponse.json(
        { error: "Invalid date format for start or end parameter. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (startParam > endParam) {
      return NextResponse.json(
        { error: "start date must be before or equal to end date." },
        { status: 400 }
      );
    }

    const startUtc = toUtcStartOfDay(startParam, timeZone);
    const endUtc = toUtcEndOfDay(endParam, timeZone);

    const areaIdFilter = searchParams.get("areaId");
    const projectIdFilter = searchParams.get("projectId");

    // Hierarchy filter builder
    const hierarchyWhere: any = {};
    if (projectIdFilter) {
      hierarchyWhere.OR = [
        { projectId: projectIdFilter },
        { subProject: { projectId: projectIdFilter } },
      ];
    } else if (areaIdFilter) {
      hierarchyWhere.OR = [
        { areaId: areaIdFilter },
        { project: { areaId: areaIdFilter } },
        { subProject: { project: { areaId: areaIdFilter } } },
      ];
    }

    // Parallel range-filtered database queries
    const [
      rangeTasks,
      unscheduledTasks,
      habitLogs,
      activeHabits,
      projectMilestones,
    ] = await Promise.all([
      // 1. Tasks in Range (Scheduled or Due)
      prisma.task.findMany({
        where: {
          userId,
          archivedAt: null,
          status: { not: TaskStatus.CANCELLED },
          AND: [
            {
              OR: [
                { scheduledDate: { gte: startParam, lte: endParam } },
                { dueDate: { gte: startUtc, lte: endUtc } },
              ],
            },
            hierarchyWhere,
          ],
        },
        include: {
          area: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          subProject: {
            select: {
              id: true,
              name: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { order: "asc" },
          { createdAt: "asc" },
        ],
      }),

      // 2. Unscheduled Active Tasks (Backlog Drawer: scheduledDate == null)
      prisma.task.findMany({
        where: {
          userId,
          archivedAt: null,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
          scheduledDate: null,
          ...hierarchyWhere,
        },
        include: {
          area: { select: { id: true, name: true } },
          project: { select: { id: true, name: true } },
          subProject: {
            select: {
              id: true,
              name: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [
          { priority: "desc" },
          { dueDate: "asc" },
          { createdAt: "asc" },
        ],
      }),

      // 3. Habit Completion Logs in Range
      prisma.habitLog.findMany({
        where: {
          userId,
          date: { gte: startParam, lte: endParam },
        },
        select: {
          id: true,
          habitId: true,
          date: true,
          completedAt: true,
        },
      }),

      // 4. Active Habits Definitions
      prisma.habit.findMany({
        where: {
          userId,
          archivedAt: null,
          ...(areaIdFilter ? { areaId: areaIdFilter } : {}),
        },
        include: {
          area: true,
          logs: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // 5. Project Milestones in Range
      prisma.project.findMany({
        where: {
          userId,
          archivedAt: null,
          targetDate: { gte: startUtc, lte: endUtc },
          ...(areaIdFilter ? { areaId: areaIdFilter } : {}),
          ...(projectIdFilter ? { id: projectIdFilter } : {}),
        },
        select: {
          id: true,
          name: true,
          targetDate: true,
          areaId: true,
          area: { select: { name: true } },
        },
      }),
    ]);

    // Map Tasks with resolved Area/Project names
    const mappedTasks = rangeTasks.map((task) => {
      const areaName =
        task.area?.name ||
        task.project?.name ||
        task.subProject?.project?.name ||
        null;
      const projectName =
        task.project?.name || task.subProject?.project?.name || null;

      return {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        scheduledDate: task.scheduledDate || null,
        areaId: task.areaId || null,
        areaName,
        projectId: task.projectId || null,
        projectName,
        subProjectId: task.subProjectId || null,
        subProjectName: task.subProject?.name || null,
      };
    });

    const mappedUnscheduled = unscheduledTasks.map((task) => {
      const areaName =
        task.area?.name ||
        task.project?.name ||
        task.subProject?.project?.name ||
        null;
      const projectName =
        task.project?.name || task.subProject?.project?.name || null;

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        scheduledDate: null,
        areaId: task.areaId || null,
        areaName,
        projectId: task.projectId || null,
        projectName,
      };
    });

    // Map Habits using dynamic streak calculation
    const mappedHabits = activeHabits.map((h: any) => {
      const resp = mapHabitToResponse(h, { timeZone, todayStr });
      return {
        id: h.id,
        name: h.name,
        frequency: h.frequency,
        targetDaysPerWeek: h.targetDaysPerWeek,
        streak: resp.currentStreak,
        currentStreak: resp.currentStreak,
        longestStreak: resp.longestStreak,
        completedToday: resp.completedToday,
        areaId: h.areaId || null,
        areaName: h.area?.name || null,
        weeklyProgress: resp.weeklyProgress,
      };
    });

    const mappedMilestones = projectMilestones.map((p) => ({
      id: p.id,
      name: p.name,
      targetDate: p.targetDate ? p.targetDate.toISOString().split("T")[0] : null,
      areaId: p.areaId,
      areaName: p.area?.name || null,
    }));

    return NextResponse.json({
      startDate: startParam,
      endDate: endParam,
      tasks: mappedTasks,
      unscheduledTasks: mappedUnscheduled,
      habitLogs: habitLogs.map((log) => ({
        id: log.id,
        habitId: log.habitId,
        date: log.date,
        completedAt: log.completedAt.toISOString(),
      })),
      habits: mappedHabits,
      projectMilestones: mappedMilestones,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
