import { useState, useEffect, useCallback } from 'react';
import { CalendarResponse } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQueryCoordinator, useQuerySubscriber } from '../context/QueryCoordinator';

export function useCalendar(initialStart?: string, initialEnd?: string) {
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { invalidateQueries } = useQueryCoordinator();

  const fetchCalendar = useCallback(async (start?: string, end?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const params: any = {};
      if (start) params.start = start;
      if (end) params.end = end;

      const data = await apiClient.get<CalendarResponse>('/api/calendar', { params });
      setCalendarData(data);
    } catch (err: any) {
      console.error('Error fetching calendar commitments:', err);
      setError(err.message || 'Failed to fetch calendar');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendar(initialStart, initialEnd);
  }, [fetchCalendar, initialStart, initialEnd]);

  // Subscribe to external cache invalidations
  useQuerySubscriber('calendar', () => {
    fetchCalendar(calendarData?.startDate || initialStart, calendarData?.endDate || initialEnd);
  });

  // Schedule or Reschedule a Task (Updates scheduledDate only, leaving dueDate untouched)
  const scheduleTask = async (taskId: string, scheduledDate: string | null) => {
    try {
      await apiClient.patch(`/api/tasks/${taskId}/schedule`, { scheduledDate });
      // Optimistically update calendar data if task exists in calendar
      if (calendarData) {
        setCalendarData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tasks: prev.tasks.map((t) =>
              t.id === taskId ? { ...t, scheduledDate } : t
            ),
            unscheduledTasks: scheduledDate
              ? prev.unscheduledTasks.filter((t) => t.id !== taskId)
              : prev.unscheduledTasks,
          };
        });
      }
      invalidateQueries(['tasks', 'dashboard']);
      await fetchCalendar(calendarData?.startDate, calendarData?.endDate);
    } catch (err) {
      console.error('Error in scheduleTask:', err);
      throw err;
    }
  };

  // Toggle Task Completion from Calendar
  const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await apiClient.patch(`/api/tasks/${taskId}`, { status: newStatus });
      invalidateQueries(['tasks', 'dashboard', 'analytics']);
      if (calendarData) {
        await fetchCalendar(calendarData.startDate, calendarData.endDate);
      }
    } catch (err) {
      console.error('Error toggling task completion from calendar:', err);
      throw err;
    }
  };

  // Toggle Habit for a specific date
  const toggleHabitDay = async (habitId: string, dateStr: string) => {
    try {
      await apiClient.post(`/api/habits/${habitId}/toggle`, { date: dateStr });
      invalidateQueries(['habits', 'dashboard', 'analytics']);
      if (calendarData) {
        await fetchCalendar(calendarData.startDate, calendarData.endDate);
      }
    } catch (err) {
      console.error('Error toggling habit day from calendar:', err);
      throw err;
    }
  };

  return {
    calendarData,
    isLoading,
    error,
    refreshCalendar: fetchCalendar,
    scheduleTask,
    toggleTaskComplete,
    toggleHabitDay,
  };
}
