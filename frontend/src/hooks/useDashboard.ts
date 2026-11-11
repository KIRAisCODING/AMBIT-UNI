import { useState, useEffect, useCallback } from 'react';
import { DashboardResponse } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQueryCoordinator, useQuerySubscriber } from '../context/QueryCoordinator';

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { invalidateQueries } = useQueryCoordinator();

  const fetchDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<DashboardResponse>('/api/dashboard');
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

  // Subscribe to external cache invalidations
  useQuerySubscriber('dashboard', fetchDashboard);

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
      await apiClient.patch(`/api/tasks/${taskId}`, { status: newStatus });
      // Invalidate cross-view queries so Tasks, Calendar, and Analytics stay in sync
      invalidateQueries(['tasks', 'calendar', 'analytics']);
      await fetchDashboard();
    } catch (err) {
      console.error('Failed to toggle task completion:', err);
      await fetchDashboard();
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
      await apiClient.post(`/api/habits/${habitId}/toggle`, {});
      invalidateQueries(['habits', 'calendar', 'analytics']);
      await fetchDashboard();
    } catch (err) {
      console.error('Failed to toggle habit:', err);
      await fetchDashboard();
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
