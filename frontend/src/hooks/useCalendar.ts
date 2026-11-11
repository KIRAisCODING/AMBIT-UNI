import { useState, useEffect, useCallback } from 'react';
import { CalendarResponse } from '../types';

export function useCalendar(initialStart?: string, initialEnd?: string) {
  const [calendarData, setCalendarData] = useState<CalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (start?: string, end?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      
      const queryParams = new URLSearchParams();
      if (start) queryParams.set('start', start);
      if (end) queryParams.set('end', end);
      queryParams.set('timeZone', userTimeZone);

      const res = await fetch(`/api/calendar?${queryParams.toString()}`, {
        headers: {
          'x-timezone': userTimeZone,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load calendar data: ${res.statusText}`);
      }

      const data: CalendarResponse = await res.json();
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

  // Schedule or Reschedule a Task (Updates scheduledDate only, leaving dueDate untouched)
  const scheduleTask = async (taskId: string, scheduledDate: string | null) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledDate }),
      });
      if (!res.ok) {
        throw new Error('Failed to update task schedule');
      }
      if (calendarData) {
        await fetchCalendar(calendarData.startDate, calendarData.endDate);
      }
    } catch (err) {
      console.error('Error in scheduleTask:', err);
      throw err;
    }
  };

  // Toggle Task Completion from Calendar
  const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
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
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      await fetch(`/api/habits/${habitId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-timezone': userTimeZone,
        },
        body: JSON.stringify({ date: dateStr }),
      });
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
