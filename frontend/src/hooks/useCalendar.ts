import { useState, useEffect } from 'react';
import { BrainItem } from '../types';

export function useCalendar() {
  const [calendarItems, setCalendarItems] = useState<BrainItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCalendar = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const data = await res.json();
        setCalendarItems(data.map(mapBackendTaskToBrainItem));
      }
    } catch (err) {
      console.error('Failed to load calendar:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const scheduleItem = async (id: string, dateStr: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deadline: dateStr || null }),
      });
      await fetchCalendar();
    } catch (err) {
      console.error('Failed to schedule item:', err);
    }
  };

  return {
    calendarItems,
    isLoading,
    scheduleItem,
    refreshCalendar: fetchCalendar,
  };
}

function mapBackendTaskToBrainItem(item: any): BrainItem {
  const taskData = item.task || {};
  let deadline = undefined;
  if (taskData.deadline) {
    deadline = taskData.deadline.split('T')[0];
  }

  return {
    id: item.id,
    content: item.content,
    title: item.content,
    type: item.type as any,
    assignment: item.assigned ? 'now' : 'later',
    area: item.area || undefined,
    project: item.project || undefined,
    subProject: item.subProject || undefined,
    tags: item.tags || [],
    createdAt: item.createdAt || new Date().toISOString(),
    completed: Boolean(taskData.completed),
    scheduledDate: deadline,
    smartSummary: item.smartSummary || undefined,
    categorySuggestion: item.categorySuggestion || undefined,
    order: item.order || undefined,
  };
}
