/**
 * AMBIT Habit & Routine Tracking Utilities
 * Architecture Decisions 01 & 09
 */

import { HabitFrequency } from "@prisma/client";
import {
  getUserLocalToday,
  addDaysToDateOnly,
  isValidDateOnly,
  parseISODateOnly,
} from "./dateUtils";

export interface IsoWeekBounds {
  monday: string; // YYYY-MM-DD
  sunday: string; // YYYY-MM-DD
}

/**
 * Calculates the Monday and Sunday dates (ISO 8601 calendar week) for a given YYYY-MM-DD date string.
 * Monday is day 1, Sunday is day 7.
 */
export function getIsoWeekBounds(dateStr: string): IsoWeekBounds {
  parseISODateOnly(dateStr);
  const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // 1 = Monday, 7 = Sunday
  const monday = addDaysToDateOnly(dateStr, -(dayOfWeek - 1));
  const sunday = addDaysToDateOnly(monday, 6);
  return { monday, sunday };
}

export interface DailyStreakResult {
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculates streaks for a DAILY habit.
 * - Current streak:
 *   If today is completed: traces consecutive completed days backwards from today.
 *   Else if yesterday was completed: preserves streak up to yesterday (grace period for today).
 *   Else: 0.
 * - Longest streak: max consecutive completed days across the habit's history on or after startDate.
 */
export function calculateDailyStreak(
  completedDates: string[],
  todayStr: string,
  startDateStr?: string | null
): DailyStreakResult {
  const datesSet = new Set<string>();
  for (const d of completedDates) {
    if (isValidDateOnly(d)) {
      if (!startDateStr || d >= startDateStr) {
        datesSet.add(d);
      }
    }
  }

  const completedToday = datesSet.has(todayStr);
  const yesterday = addDaysToDateOnly(todayStr, -1);

  // 1. Current Streak
  let currentStreak = 0;
  if (completedToday) {
    let curr = todayStr;
    while (datesSet.has(curr) && (!startDateStr || curr >= startDateStr)) {
      currentStreak++;
      curr = addDaysToDateOnly(curr, -1);
    }
  } else if (datesSet.has(yesterday)) {
    let curr = yesterday;
    while (datesSet.has(curr) && (!startDateStr || curr >= startDateStr)) {
      currentStreak++;
      curr = addDaysToDateOnly(curr, -1);
    }
  }

  // 2. Longest Streak
  const sortedDates = Array.from(datesSet).sort();
  let longestStreak = 0;
  if (sortedDates.length > 0) {
    let maxRun = 1;
    let currentRun = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = sortedDates[i - 1];
      const curr = sortedDates[i];
      if (curr === addDaysToDateOnly(prev, 1)) {
        currentRun++;
        if (currentRun > maxRun) maxRun = currentRun;
      } else if (curr !== prev) {
        currentRun = 1;
      }
    }
    longestStreak = Math.max(maxRun, currentStreak);
  } else {
    longestStreak = currentStreak;
  }

  return {
    completedToday,
    currentStreak,
    longestStreak,
  };
}

export interface WeeklyProgress {
  completed: number;
  target: number;
  targetMet: boolean;
  bonusDays: number;
  currentWeekMonday: string;
  currentWeekSunday: string;
}

export interface WeeklyStreakResult {
  completedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: WeeklyProgress;
}

/**
 * Calculates streaks and weekly progress for a WEEKLY habit.
 * - Week boundary: Monday to Sunday (ISO 8601).
 * - A week is successful iff distinct completed days >= targetDaysPerWeek.
 * - Current streak:
 *   If current week target is met: traces consecutive successful weeks backwards.
 *   Else if last week target was met: preserves streak up to last week (grace period for current week).
 *   Else: 0.
 * - Longest streak: max consecutive successful weeks across history.
 */
export function calculateWeeklyStreak(
  completedDates: string[],
  todayStr: string,
  targetDaysPerWeek: number = 3,
  startDateStr?: string | null
): WeeklyStreakResult {
  const safeTarget = Math.max(1, Math.min(7, targetDaysPerWeek));
  const datesSet = new Set<string>();

  // For weekly habits, the first eligible cycle begins on Monday of the start week
  const startWeekMonday = startDateStr
    ? getIsoWeekBounds(startDateStr).monday
    : null;

  for (const d of completedDates) {
    if (isValidDateOnly(d)) {
      if (!startWeekMonday || d >= startWeekMonday) {
        datesSet.add(d);
      }
    }
  }

  const completedToday = datesSet.has(todayStr);

  // Group unique dates into ISO week Mondays
  const weekCountMap = new Map<string, number>();
  for (const d of datesSet) {
    const { monday } = getIsoWeekBounds(d);
    weekCountMap.set(monday, (weekCountMap.get(monday) || 0) + 1);
  }

  const { monday: currentWeekMonday, sunday: currentWeekSunday } = getIsoWeekBounds(todayStr);
  const currentWeekCompleted = weekCountMap.get(currentWeekMonday) || 0;
  const isCurrentWeekMet = currentWeekCompleted >= safeTarget;
  const bonusDays = Math.max(0, currentWeekCompleted - safeTarget);

  const weeklyProgress: WeeklyProgress = {
    completed: currentWeekCompleted,
    target: safeTarget,
    targetMet: isCurrentWeekMet,
    bonusDays,
    currentWeekMonday,
    currentWeekSunday,
  };

  // 1. Current Weekly Streak
  let currentStreak = 0;
  const lastWeekMonday = addDaysToDateOnly(currentWeekMonday, -7);

  if (isCurrentWeekMet) {
    let currWeek = currentWeekMonday;
    while ((weekCountMap.get(currWeek) || 0) >= safeTarget) {
      currentStreak++;
      currWeek = addDaysToDateOnly(currWeek, -7);
    }
  } else if ((weekCountMap.get(lastWeekMonday) || 0) >= safeTarget) {
    let currWeek = lastWeekMonday;
    while ((weekCountMap.get(currWeek) || 0) >= safeTarget) {
      currentStreak++;
      currWeek = addDaysToDateOnly(currWeek, -7);
    }
  }

  // 2. Longest Weekly Streak
  const successfulMondays = Array.from(weekCountMap.entries())
    .filter(([_, count]) => count >= safeTarget)
    .map(([monday]) => monday)
    .sort();

  let longestStreak = 0;
  if (successfulMondays.length > 0) {
    let maxRun = 1;
    let currentRun = 1;
    for (let i = 1; i < successfulMondays.length; i++) {
      const prev = successfulMondays[i - 1];
      const curr = successfulMondays[i];
      if (curr === addDaysToDateOnly(prev, 7)) {
        currentRun++;
        if (currentRun > maxRun) maxRun = currentRun;
      } else if (curr !== prev) {
        currentRun = 1;
      }
    }
    longestStreak = Math.max(maxRun, currentStreak);
  } else {
    longestStreak = currentStreak;
  }

  return {
    completedToday,
    currentStreak,
    longestStreak,
    weeklyProgress,
  };
}

/**
 * Maps a Prisma Habit model (with included logs and area) to the standard API response JSON.
 */
export function mapHabitToResponse(
  habit: any,
  options?: { timeZone?: string; todayStr?: string }
) {
  const timeZone = options?.timeZone || "UTC";
  const todayStr = options?.todayStr || getUserLocalToday(timeZone);

  // Extract completed dates from logs
  const logs = Array.isArray(habit.logs) ? habit.logs : [];
  const completedDates = logs.map((log: any) => log.date);

  // startDate string in user's calendar date
  let startDateStr: string | null = null;
  if (habit.startDate) {
    try {
      startDateStr = habit.startDate.toISOString().split("T")[0];
    } catch {
      startDateStr = null;
    }
  }

  const isWeekly = habit.frequency === HabitFrequency.WEEKLY;
  const targetDaysPerWeek = habit.targetDaysPerWeek || 3;

  let completedToday = false;
  let currentStreak = 0;
  let longestStreak = 0;
  let weeklyProgress: WeeklyProgress | null = null;

  if (isWeekly) {
    const weeklyResult = calculateWeeklyStreak(
      completedDates,
      todayStr,
      targetDaysPerWeek,
      startDateStr
    );
    completedToday = weeklyResult.completedToday;
    currentStreak = weeklyResult.currentStreak;
    longestStreak = weeklyResult.longestStreak;
    weeklyProgress = weeklyResult.weeklyProgress;
  } else {
    const dailyResult = calculateDailyStreak(
      completedDates,
      todayStr,
      startDateStr
    );
    completedToday = dailyResult.completedToday;
    currentStreak = dailyResult.currentStreak;
    longestStreak = dailyResult.longestStreak;

    // For Daily habits, provide weekly progress as completed days this week out of 7
    const { monday, sunday } = getIsoWeekBounds(todayStr);
    const thisWeekLogs = completedDates.filter(
      (d: string) => d >= monday && d <= sunday
    );
    weeklyProgress = {
      completed: thisWeekLogs.length,
      target: 7,
      targetMet: thisWeekLogs.length === 7,
      bonusDays: 0,
      currentWeekMonday: monday,
      currentWeekSunday: sunday,
    };
  }

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description || null,
    frequency: habit.frequency,
    targetDaysPerWeek: isWeekly ? targetDaysPerWeek : null,
    startDate: habit.startDate ? habit.startDate.toISOString() : null,
    archived: Boolean(habit.archivedAt),
    archivedAt: habit.archivedAt ? habit.archivedAt.toISOString() : null,
    areaId: habit.areaId || null,
    area: habit.area?.name || null,
    completedToday,
    streak: currentStreak, // Backward compatibility alias
    currentStreak,
    longestStreak,
    notes: habit.description || null, // Backward compatibility alias
    weeklyProgress,
    completedDays: completedDates.sort(), // for backward-compatible calendar matrix widgets
    createdAt: habit.createdAt.toISOString(),
    updatedAt: habit.updatedAt.toISOString(),
  };
}
