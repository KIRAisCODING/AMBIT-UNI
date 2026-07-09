import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get("timeRange") || "7days";

    // 1. Fetch all items and habits belonging to user
    const items = await prisma.inboxItem.findMany({
      where: { userId },
      include: { task: true }
    });
    const habits = await prisma.habit.findMany({
      where: { userId }
    });
    const areas = await prisma.area.findMany({
      where: { userId },
      include: { projects: { include: { subProjects: true } } }
    });

    const areaMap = new Map(areas.map((a: any) => [a.id, a.name]));

    const resolvedItems = items.map((item: any) => ({
      ...item,
      area: item.areaId ? areaMap.get(item.areaId) : null,
    }));

    // 2. Area progress
    const areaProgress: Record<string, number> = {};
    const defaultAreas = ["Work", "Personal", "Education", "Side Projects"];
    const fallbackMap: Record<string, number> = {
      Work: 0,
      Personal: 0,
      Education: 0,
      "Side Projects": 0,
    };

    for (const area of defaultAreas) {
      const areaTasks = resolvedItems.filter((it: any) => it.area === area && it.type === "Task");
      if (areaTasks.length > 0) {
        const completed = areaTasks.filter((it: any) => it.task?.completed).length;
        areaProgress[area] = Math.round((completed / areaTasks.length) * 100);
      } else {
        areaProgress[area] = fallbackMap[area] || 0; // Starts clean/empty for new user
      }
    }

    // Include user-defined areas in areaProgress
    for (const area of areas) {
      if (!defaultAreas.includes(area.name)) {
        const areaTasks = resolvedItems.filter((it: any) => it.areaId === area.id && it.type === "Task");
        if (areaTasks.length > 0) {
          const completed = areaTasks.filter((it: any) => it.task?.completed).length;
          areaProgress[area.name] = Math.round((completed / areaTasks.length) * 100);
        } else {
          areaProgress[area.name] = 0;
        }
      }
    }

    // 3. Momentum data
    const daysCount = timeRange === "7days" ? 7 : timeRange === "14days" ? 14 : timeRange === "month" ? 30 : 90;
    const today = new Date();
    const momentumData: { dateStr: string; label: string; count: number }[] = [];

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().split("T")[0];

      const actualCount = resolvedItems.filter(
        (it: any) =>
          it.type === "Task" &&
          it.task?.completed &&
          (it.task?.deadline?.toISOString().startsWith(dStr) ||
            it.createdAt.toISOString().split("T")[0] === dStr)
      ).length;

      momentumData.push({
        dateStr: dStr,
        label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: actualCount,
      });
    }

    // Trend Status
    const half = Math.floor(momentumData.length / 2);
    const firstHalf = momentumData.slice(0, half).reduce((sum, d) => sum + d.count, 0);
    const secondHalf = momentumData.slice(half).reduce((sum, d) => sum + d.count, 0);
    let trendText = "Stable";
    let trendColor = "text-neutral-500 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800/30";

    if (secondHalf > firstHalf) {
      trendText = "Improving";
      trendColor = "text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20";
    } else if (secondHalf < firstHalf) {
      trendText = "Slipping";
      trendColor = "text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20";
    }

    // 4. Heatmap data (completed habits count per date)
    const habitHeatmap: Record<string, number> = {};
    for (const habit of habits) {
      for (const day of habit.completedDays) {
        habitHeatmap[day] = (habitHeatmap[day] || 0) + 1;
      }
    }

    // 5. Unassigned thoughts
    const unassignedCount = resolvedItems.filter((it: any) => !it.assigned || !it.areaId).length;

    // 6. This week metrics
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);

    const completedThisWeek = resolvedItems.filter(
      (it: any) => it.type === "Task" && it.task?.completed && it.createdAt >= oneWeekAgo
    ).length;

    const createdThisWeek = resolvedItems.filter((it: any) => it.createdAt >= oneWeekAgo).length;

    // Habit completion rate this week
    let totalScheduledHabits = 0;
    let completedHabitsCount = 0;
    const datesThisWeek: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      datesThisWeek.push(d.toISOString().split("T")[0]);
    }

    for (const habit of habits) {
      if (habit.frequency === "daily") {
        totalScheduledHabits += 7;
        completedHabitsCount += habit.completedDays.filter((d: any) => datesThisWeek.includes(d)).length;
      } else {
        totalScheduledHabits += 1;
        const completedCount = habit.completedDays.filter((d: any) => datesThisWeek.includes(d)).length;
        if (completedCount > 0) completedHabitsCount += 1;
      }
    }
    const habitCompletionRate =
      totalScheduledHabits > 0 ? Math.round((completedHabitsCount / totalScheduledHabits) * 100) : 0;

    // 7. Active projects
    const projectsList: { name: string; pct: number; total: number }[] = [];
    for (const area of areas) {
      for (const proj of area.projects) {
        const projTasks = resolvedItems.filter(
          (it: any) => it.projectId === proj.id && it.type === "Task"
        );
        const completed = projTasks.filter((it: any) => it.task?.completed).length;
        const pct = projTasks.length > 0 ? Math.round((completed / projTasks.length) * 100) : 0;
        projectsList.push({
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
        activeProjectsCount: areas.flatMap((a: any) => a.projects).length,
      },
      activeProjects: projectsList,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
