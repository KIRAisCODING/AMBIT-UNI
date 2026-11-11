import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { TaskStatus, HabitFrequency, ProjectStatus, CaptureStatus } from "@prisma/client";
import { getUserLocalToday, addDaysToDateOnly } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { session, errorResponse } = await authenticateAndRateLimit("read");
    if (errorResponse) return errorResponse;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get("timeRange") || "7days";
    const timeZone =
      req.headers.get("x-timezone") ||
      searchParams.get("timezone") ||
      searchParams.get("timeZone") ||
      "UTC";

    // 1. Parallel fetch of core user entities
    const [areas, tasks, habits, habitLogs, unassignedCapturesCount, unassignedNotesCount] =
      await Promise.all([
        prisma.area.findMany({
          where: { userId, archivedAt: null },
          orderBy: { order: "asc" },
          include: {
            projects: {
              where: { archivedAt: null },
              orderBy: { order: "asc" },
              include: {
                subProjects: {
                  where: { archivedAt: null },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        }),
        prisma.task.findMany({
          where: { userId, archivedAt: null },
          include: {
            project: { select: { id: true, name: true, areaId: true } },
            subProject: {
              select: {
                id: true,
                name: true,
                project: { select: { id: true, name: true, areaId: true } },
              },
            },
          },
        }),
        prisma.habit.findMany({
          where: { userId, archivedAt: null },
        }),
        prisma.habitLog.findMany({
          where: { userId },
          select: { habitId: true, date: true, completedAt: true },
        }),
        prisma.capture.count({
          where: { userId, status: CaptureStatus.INBOX },
        }),
        prisma.note.count({
          where: {
            userId,
            archivedAt: null,
            areaId: null,
            projectId: null,
            subProjectId: null,
          },
        }),
      ]);

    // 2. Resolve derived hierarchy mappings for tasks
    // Decision 02 & 05: A task can be directly in an area, or inherit from project/subproject
    const resolvedTasks = tasks.map((t) => {
      const effectiveAreaId =
        t.areaId ||
        t.project?.areaId ||
        t.subProject?.project?.areaId ||
        null;
      const effectiveProjectId =
        t.projectId ||
        t.subProject?.project?.id ||
        null;
      return {
        ...t,
        effectiveAreaId,
        effectiveProjectId,
      };
    });

    // 3. Area Progress Calculation
    // Exclude CANCELLED tasks from both numerator and denominator (Decision 04)
    const defaultAreas = ["Work", "Personal", "Education", "Side Projects"];
    const areaProgress: Record<string, number> = {};

    // Initialize default areas
    for (const defaultAreaName of defaultAreas) {
      areaProgress[defaultAreaName] = 0;
    }

    // Compute progress for all active areas
    for (const area of areas) {
      const areaTasks = resolvedTasks.filter(
        (t) => t.effectiveAreaId === area.id && t.status !== TaskStatus.CANCELLED
      );
      if (areaTasks.length > 0) {
        const completed = areaTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
        areaProgress[area.name] = Math.round((completed / areaTasks.length) * 100);
      } else {
        areaProgress[area.name] = 0;
      }
    }

    // 4. Momentum Data & Trend Status
    // Days count: 7days -> 7, 14days -> 14, month -> 30, 3months -> 90
    const daysCount =
      timeRange === "7days"
        ? 7
        : timeRange === "14days"
        ? 14
        : timeRange === "month"
        ? 30
        : 90;

    const todayStr = getUserLocalToday(timeZone);

    // Formatter to map completedAt timestamp into user local YYYY-MM-DD
    let localDateFormatter: Intl.DateTimeFormat;
    try {
      localDateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      localDateFormatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    // Map completed tasks by their local date string
    const completedCountsByDate = new Map<string, number>();
    for (const t of resolvedTasks) {
      if (t.status === TaskStatus.COMPLETED && t.completedAt) {
        const localDate = localDateFormatter.format(t.completedAt);
        completedCountsByDate.set(localDate, (completedCountsByDate.get(localDate) || 0) + 1);
      }
    }

    const momentumData: { dateStr: string; label: string; count: number }[] = [];
    for (let i = daysCount - 1; i >= 0; i--) {
      const dStr = addDaysToDateOnly(todayStr, -i);
      const [y, m, d] = dStr.split("-").map(Number);
      const dateUtc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const label = dateUtc.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      const count = completedCountsByDate.get(dStr) || 0;

      momentumData.push({
        dateStr: dStr,
        label,
        count,
      });
    }

    // Trend Status Calculation (4-branch classification matching AnalyticsView)
    const half = Math.floor(momentumData.length / 2);
    const firstHalf = momentumData.slice(0, half).reduce((sum, d) => sum + d.count, 0);
    const secondHalf = momentumData.slice(half).reduce((sum, d) => sum + d.count, 0);

    let trendText = "Stable";
    let trendColor = "text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30";

    if (secondHalf > firstHalf + 2) {
      trendText = "Improving";
      trendColor = "text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20";
    } else if (secondHalf < firstHalf - 2) {
      trendText = "Slipping";
      trendColor = "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20";
    } else if (secondHalf > 0 && firstHalf === 0) {
      trendText = "Recovering";
      trendColor = "text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20";
    }

    // 5. Habit Consistency Heatmap
    // Aggregates HabitLog check-ins by date (YYYY-MM-DD)
    const habitHeatmap: Record<string, number> = {};
    for (const log of habitLogs) {
      habitHeatmap[log.date] = (habitHeatmap[log.date] || 0) + 1;
    }

    // 6. Unassigned Thoughts / Items
    // Captures (INBOX) + Tasks (no area, no project, no subproject) + Notes (unassigned)
    const unassignedTasksCount = resolvedTasks.filter(
      (t) => !t.areaId && !t.projectId && !t.subProjectId
    ).length;
    const unassignedCount = unassignedCapturesCount + unassignedTasksCount + unassignedNotesCount;

    // 7. This Week Metrics
    const past7DaysSet = new Set<string>();
    for (let i = 0; i < 7; i++) {
      past7DaysSet.add(addDaysToDateOnly(todayStr, -i));
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const completedThisWeek = resolvedTasks.filter(
      (t) => t.status === TaskStatus.COMPLETED && t.completedAt && t.completedAt >= sevenDaysAgo
    ).length;

    const createdThisWeek = resolvedTasks.filter((t) => t.createdAt >= sevenDaysAgo).length;

    // Habit completion rate this week
    let totalScheduledHabits = 0;
    let completedHabitsCount = 0;

    for (const habit of habits) {
      const logsThisWeek = habitLogs.filter(
        (l) => l.habitId === habit.id && past7DaysSet.has(l.date)
      ).length;

      if (habit.frequency === HabitFrequency.DAILY) {
        totalScheduledHabits += 7;
        completedHabitsCount += Math.min(logsThisWeek, 7);
      } else {
        const target = habit.targetDaysPerWeek || 3;
        totalScheduledHabits += target;
        completedHabitsCount += Math.min(logsThisWeek, target);
      }
    }

    const habitCompletionRate =
      totalScheduledHabits > 0
        ? Math.round((completedHabitsCount / totalScheduledHabits) * 100)
        : 0;

    // 8. Active Projects Progress
    const allProjects = areas.flatMap((a) => a.projects);
    const activeProjectsList: { name: string; pct: number; total: number }[] = [];

    for (const proj of allProjects) {
      if (proj.status === ProjectStatus.ACTIVE) {
        const projTasks = resolvedTasks.filter(
          (t) => t.effectiveProjectId === proj.id && t.status !== TaskStatus.CANCELLED
        );
        const completed = projTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
        const pct = projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0;
        activeProjectsList.push({
          name: proj.name,
          pct,
          total: projTasks.length,
        });
      }
    }

    return NextResponse.json({
      areaProgress,
      momentumData,
      trendStatus: { text: trendText, color: trendColor },
      habitHeatmap,
      unassignedCount,
      thisWeekMetrics: {
        completedThisWeek,
        createdThisWeek,
        habitCompletionRate,
        activeProjectsCount: allProjects.filter((p) => p.status === ProjectStatus.ACTIVE).length,
      },
      activeProjects: activeProjectsList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
