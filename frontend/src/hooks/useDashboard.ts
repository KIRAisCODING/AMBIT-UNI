import { useState, useEffect, useCallback } from 'react';
import { DashboardResponse } from '../types';

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/dashboard?timezone=${encodeURIComponent(userTimeZone)}`, {
        headers: {
          'x-timezone': userTimeZone,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load dashboard: ${res.statusText}`);
      }

      const data: DashboardResponse = await res.json();
      setDashboard(data);
    } catch (err: any) {
      console.error('Error fetching dashboard briefing:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Inline Task Complete Toggle (Optimistic)
  const toggleTaskComplete = async (taskId: string) => {
    if (!dashboard) return;

    // Optimistically update todayFocus tasks
    const existingTask = dashboard.todayFocus.tasks.find((t) => t.id === taskId);
    const newStatus = existingTask?.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';

    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        todayFocus: {
          ...prev.todayFocus,
          tasks: prev.todayFocus.tasks.map((t) =>
            t.id === taskId ? { ...t, status: newStatus } : t
          ),
        },
      };
    });

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Silent refresh to update counts and project progress
      fetchDashboard();
    } catch (err) {
      console.error('Failed to toggle task completion:', err);
      fetchDashboard();
    }
  };

  // Inline Habit Check-in Toggle (Optimistic)
  const toggleHabitToday = async (habitId: string) => {
    if (!dashboard) return;

    const existingHabit = dashboard.habitsSnapshot.find((h) => h.id === habitId);
    const wasCompleted = Boolean(existingHabit?.completedToday);
    const newCompleted = !wasCompleted;
    const newStreak = newCompleted
      ? (existingHabit?.streak || 0) + 1
      : Math.max(0, (existingHabit?.streak || 1) - 1);

    setDashboard((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        habitsSnapshot: prev.habitsSnapshot.map((h) =>
          h.id === habitId
            ? { ...h, completedToday: newCompleted, streak: newStreak, currentStreak: newStreak }
            : h
        ),
      };
    });

    try {
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await fetch(`/api/habits/${habitId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timezone': userTimeZone,
        },
      });
      fetchDashboard();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
      fetchDashboard();
    }
  };

  return {
    dashboard,
    isLoading,
    error,
    refreshDashboard: fetchDashboard,
    toggleTaskComplete,
    toggleHabitToday,
  };
}

