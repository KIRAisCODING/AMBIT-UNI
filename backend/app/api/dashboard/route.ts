import { authenticateAndRateLimit } from "@/lib/rateLimit";
import { prisma } from "@/lib/prisma";
import { TaskStatus, ProjectStatus } from "@prisma/client";
import {
  getUserLocalToday,
  addDaysToDateOnly,
  toUtcStartOfDay,
  toUtcEndOfDay,
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

    // 1. Resolve Timezone Boundaries (Pure User-Local Clock)
    const todayStr = getUserLocalToday(timeZone);
    const todayStart = toUtcStartOfDay(todayStr, timeZone);
    const todayEnd = toUtcEndOfDay(todayStr, timeZone);
    const tomorrowStr = addDaysToDateOnly(todayStr, 1);
    const upcomingEndStr = addDaysToDateOnly(todayStr, 7);

    // Formatter for converting UTC dates to user's local YYYY-MM-DD
    const localDateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const toLocalYmd = (date: Date): string => {
      try {
        return localDateFormatter.format(date);
      } catch {
        return date.toISOString().split("T")[0];
      }
    };

    // Formatter for day label (e.g. "Tomorrow", "Thursday, Oct 24")
    const dayLabelFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    // Determine greeting based on local hour
    let greetingText = "Good morning";
    try {
      const hourFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hour12: false,
      });
      const hour = parseInt(hourFormatter.format(new Date()), 10);
      if (hour >= 12 && hour < 17) greetingText = "Good afternoon";
      else if (hour >= 17) greetingText = "Good evening";
    } catch {
      // Fallback
    }

    // 2. Parallel Database Aggregation
    const [
      unprocessedCount,
      recentCaptures,
      activeTasks,
      habits,
      activeProjects,
    ] = await Promise.all([
      // 2.1 Unprocessed Captures Count
      prisma.capture.count({
        where: { userId, status: "INBOX" },
      }),

      // 2.2 Recent 2 Captures for Quick Reminder
      prisma.capture.findMany({
        where: { userId, status: "INBOX" },
        take: 2,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          createdAt: true,
        },
      }),

      // 2.3 Active Tasks for Today/Focus and Upcoming (TODO or IN_PROGRESS)
      prisma.task.findMany({
        where: {
          userId,
          archivedAt: null,
          status: { in: [TaskStatus.TODO, TaskStatus.IN_PROGRESS] },
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

      // 2.4 Active Habits with Logs
      prisma.habit.findMany({
        where: { userId, archivedAt: null },
        include: {
          area: true,
          logs: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // 2.5 Active Projects (Prioritized by order, then recently updated)
      prisma.project.findMany({
        where: {
          userId,
          archivedAt: null,
          status: ProjectStatus.ACTIVE,
        },
        include: {
          area: { select: { id: true, name: true } },
          tasks: {
            where: { archivedAt: null, status: { not: TaskStatus.CANCELLED } },
            select: { id: true, status: true },
          },
          subProjects: {
            include: {
              tasks: {
                where: { archivedAt: null, status: { not: TaskStatus.CANCELLED } },
                select: { id: true, status: true },
              },
            },
          },
        },
        orderBy: [
          { order: "asc" },
          { updatedAt: "desc" },
        ],
        take: 4,
      }),
    ]);

    // 3. Process Today / Focus Tasks (Deterministic Categorization & Deduping)
    const todayFocusMap = new Map<string, any>();
    const todayFocusTasks: any[] = [];
    let overdueCount = 0;
    let dueTodayCount = 0;
    let inProgressCount = 0;

    for (const task of activeTasks) {
      const dueLocalStr = task.dueDate ? toLocalYmd(task.dueDate) : null;
      const isOverdue = Boolean(task.dueDate && task.dueDate < todayStart);
      const isDueToday = Boolean(
        (dueLocalStr && dueLocalStr === todayStr) ||
        (task.scheduledDate && task.scheduledDate === todayStr)
      );
      const isInProgress = task.status === TaskStatus.IN_PROGRESS;

      if (!isOverdue && !isDueToday && !isInProgress) {
        continue;
      }

      // Calculate days overdue
      let daysOverdue = 0;
      if (isOverdue && dueLocalStr) {
        const [todayY, todayM, todayD] = todayStr.split("-").map(Number);
        const [dueY, dueM, dueD] = dueLocalStr.split("-").map(Number);
        const dtToday = Date.UTC(todayY, todayM - 1, todayD);
        const dtDue = Date.UTC(dueY, dueM - 1, dueD);
        daysOverdue = Math.max(1, Math.round((dtToday - dtDue) / (1000 * 60 * 60 * 24)));
      }

      // Deterministic Category Precedence (Decision 04):
      // 1. OVERDUE takes highest precedence
      // 2. DUE_TODAY takes second precedence
      // 3. IN_PROGRESS takes third precedence
      let category: "OVERDUE" | "DUE_TODAY" | "IN_PROGRESS";
      if (isOverdue) {
        category = "OVERDUE";
        overdueCount++;
      } else if (isDueToday) {
        category = "DUE_TODAY";
        dueTodayCount++;
      } else {
        category = "IN_PROGRESS";
        inProgressCount++;
      }

      const projectName =
        task.project?.name || task.subProject?.project?.name || null;
      const areaName =
        task.area?.name || null;

      const item = {
        id: task.id,
        title: task.title,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        scheduledDate: task.scheduledDate || null,
        priority: task.priority,
        status: task.status,
        category,
        isOverdue,
        daysOverdue,
        isDueToday,
        isInProgress,
        projectName,
        areaName,
      };

      todayFocusMap.set(task.id, item);
      todayFocusTasks.push(item);
    }

    // Sort Today/Focus: OVERDUE first (by dueDate asc), then DUE_TODAY (by priority desc, then dueDate asc), then IN_PROGRESS
    todayFocusTasks.sort((a, b) => {
      const catOrder: Record<string, number> = { OVERDUE: 0, DUE_TODAY: 1, IN_PROGRESS: 2 };
      if (catOrder[a.category] !== catOrder[b.category]) {
        return catOrder[a.category] - catOrder[b.category];
      }
      if (a.category === "OVERDUE") {
        return (a.dueDate || "").localeCompare(b.dueDate || "");
      }
      const priorityWeight: any = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1, NONE: 0 };
      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      return (a.dueDate || "").localeCompare(b.dueDate || "");
    });

    // 4. Process Upcoming Tasks (Rolling 7 Calendar Days, Strict Exclusion of Today/Focus)
    const upcomingGroupsMap = new Map<string, any[]>();

    for (const task of activeTasks) {
      // Exclude every task already present in Today/Focus
      if (todayFocusMap.has(task.id)) {
        continue;
      }

      const dueLocalStr = task.dueDate ? toLocalYmd(task.dueDate) : null;
      // An upcoming task has scheduledDate in [tomorrowStr, upcomingEndStr]
      // or dueDate in [tomorrowStr, upcomingEndStr]
      let targetDate: string | null = null;
      if (
        task.scheduledDate &&
        task.scheduledDate >= tomorrowStr &&
        task.scheduledDate <= upcomingEndStr
      ) {
        targetDate = task.scheduledDate;
      } else if (
        dueLocalStr &&
        dueLocalStr >= tomorrowStr &&
        dueLocalStr <= upcomingEndStr
      ) {
        targetDate = dueLocalStr;
      }

      if (targetDate) {
        if (!upcomingGroupsMap.has(targetDate)) {
          upcomingGroupsMap.set(targetDate, []);
        }
        const projectName =
          task.project?.name || task.subProject?.project?.name || null;
        const areaName = task.area?.name || null;

        upcomingGroupsMap.get(targetDate)!.push({
          id: task.id,
          title: task.title,
          priority: task.priority,
          status: task.status,
          dueDate: task.dueDate ? task.dueDate.toISOString() : null,
          scheduledDate: task.scheduledDate || null,
          projectName,
          areaName,
        });
      }
    }

    const sortedUpcomingDates = Array.from(upcomingGroupsMap.keys()).sort();
    const upcomingTasks = sortedUpcomingDates.map((dateStr) => {
      let dateLabel = "";
      if (dateStr === tomorrowStr) {
        dateLabel = "Tomorrow";
      } else {
        const [y, m, d] = dateStr.split("-").map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        dateLabel = dayLabelFormatter.format(dt);
      }

      return {
        date: dateStr,
        dateLabel,
        tasks: upcomingGroupsMap.get(dateStr)!,
      };
    });

    // 5. Habits Snapshot
    const habitsSnapshot = habits.map((h: any) => {
      const mapped = mapHabitToResponse(h, { timeZone, todayStr });
      return {
        id: h.id,
        name: h.name,
        streak: mapped.currentStreak,
        currentStreak: mapped.currentStreak,
        completedToday: mapped.completedToday,
        frequency: h.frequency,
        targetDaysPerWeek: h.targetDaysPerWeek,
        weeklyProgress: mapped.weeklyProgress,
      };
    });

    // 6. Active Projects with Progress Formula
    const activeProjectSummaries = activeProjects.map((proj: any) => {
      const directTasks = Array.isArray(proj.tasks) ? proj.tasks : [];
      const subTasks = Array.isArray(proj.subProjects)
        ? proj.subProjects.flatMap((sp: any) => (Array.isArray(sp.tasks) ? sp.tasks : []))
        : [];
      const allEligibleTasks = [...directTasks, ...subTasks];
      const totalTasks = allEligibleTasks.length;
      const completedTasks = allEligibleTasks.filter(
        (t) => t.status === TaskStatus.COMPLETED
      ).length;

      const hasTasks = totalTasks > 0;
      const progressPct = hasTasks
        ? Math.round((completedTasks / totalTasks) * 100)
        : null;

      return {
        id: proj.id,
        name: proj.name,
        areaName: proj.area?.name || null,
        order: proj.order,
        targetDate: proj.targetDate ? proj.targetDate.toISOString().split("T")[0] : null,
        totalTasks,
        completedTasks,
        progressPct,
        hasTasks,
      };
    });

    const responsePayload = {
      greeting: {
        userName: session.user.name || "Explorer",
        localDate: todayStr,
        greetingText,
      },
      inboxSnapshot: {
        unprocessedCount,
        recentCaptures: recentCaptures.map((c) => ({
          id: c.id,
          rawContent: c.content,
          createdAt: c.createdAt.toISOString(),
        })),
      },
      todayFocus: {
        overdueCount,
        dueTodayCount,
        inProgressCount,
        tasks: todayFocusTasks.slice(0, 8), // Cognitive load cap per Decision 04
        totalCount: todayFocusTasks.length,
      },
      upcomingTasks,
      habitsSnapshot,
      activeProjects: activeProjectSummaries,
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
