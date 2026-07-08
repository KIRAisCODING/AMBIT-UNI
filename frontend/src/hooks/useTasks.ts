import { useState, useEffect } from 'react';
import { BrainItem } from '../types';

export function useTasks() {
  const [items, setItems] = useState<BrainItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setItems(data.map(mapBackendTaskToBrainItem));
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const createTask = async (task: Omit<BrainItem, 'id' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: task.content,
          type: task.type,
          assigned: task.assignment === 'now',
          area: task.area || null,
          project: task.project || null,
          subProject: task.subProject || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = mapBackendTaskToBrainItem(data);
        setItems(prev => [mapped, ...prev]);
        return mapped;
      }
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const updateTask = async (id: string, updates: Partial<BrainItem>) => {
    try {
      // If content is modified, call the rename route
      if (updates.content !== undefined) {
        await fetch(`/api/tasks/${id}/rename`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: updates.content }),
        });
      }

      // Prepare fields to patch task details
      const payload: any = {};
      if (updates.completed !== undefined) payload.completed = updates.completed;
      if (updates.scheduledDate !== undefined) payload.deadline = updates.scheduledDate || null;
      if (updates.content !== undefined) payload.description = updates.content;

      if (Object.keys(payload).length > 0) {
        await fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      await fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const assignTask = async (id: string, area: string, project: string, subProject: string) => {
    try {
      const res = await fetch(`/api/inbox/${id}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, project, subProject }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (err) {
      console.error('Failed to assign task:', err);
    }
  };

  const reorderTasks = async (orderedIds: string[]) => {
    const reordered = items.map((it) => {
      const idx = orderedIds.indexOf(it.id);
      if (idx !== -1) return { ...it, order: idx };
      return it;
    });
    setItems(reordered);
  };

  return {
    items,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    reorderTasks,
    refreshTasks: fetchTasks,
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
