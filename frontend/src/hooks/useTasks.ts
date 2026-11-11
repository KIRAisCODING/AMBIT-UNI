import { useState, useEffect, useCallback } from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQueryCoordinator, useQuerySubscriber } from '../context/QueryCoordinator';

export interface CreateTaskInput {
  title?: string;
  content?: string; // fallback for legacy code
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | 'low' | 'medium' | 'high';
  dueDate?: string | null;
  scheduledDate?: string | null;
  areaId?: string | null;
  projectId?: string | null;
  subProjectId?: string | null;
  tags?: string[];
  area?: string | null;
  project?: string | null;
  subProject?: string | null;
  order?: number;
}

export function useTasks(filterParams?: { areaId?: string; projectId?: string; subProjectId?: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { invalidateQueries } = useQueryCoordinator();

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<any[]>('/api/tasks', { params: filterParams });
      const normalized = (data || []).map(normalizeTask);
      setTasks(normalized);
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [filterParams?.areaId, filterParams?.projectId, filterParams?.subProjectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useQuerySubscriber('tasks', fetchTasks);

  const createTask = async (input: CreateTaskInput): Promise<Task> => {
    const title = input.title?.trim() || input.content?.trim() || 'Untitled Task';
    let priority: TaskPriority = 'NONE';
    if (input.priority) {
      const p = String(input.priority).toUpperCase();
      if (['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(p)) {
        priority = p as TaskPriority;
      }
    }

    const payload: any = {
      title,
      description: input.description || null,
      status: input.status || 'TODO',
      priority,
      dueDate: input.dueDate || null,
      scheduledDate: input.scheduledDate || null,
      areaId: input.areaId || null,
      projectId: input.projectId || null,
      subProjectId: input.subProjectId || null,
      tags: input.tags || [],
    };

    try {
      const data = await apiClient.post<any>('/api/tasks', payload);
      const normalized = normalizeTask(data);
      setTasks((prev) => [normalized, ...prev]);
      invalidateQueries(['dashboard', 'calendar', 'analytics']);
      return normalized;
    } catch (err: any) {
      console.error('Failed to create task:', err);
      throw err;
    }
  };

  const updateTask = async (id: string, updates: any): Promise<Task> => {
    // Normalizing update payload
    const payload: any = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined && updates.title === undefined) payload.title = updates.content;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.completed !== undefined) {
      payload.status = updates.completed ? 'COMPLETED' : 'TODO';
    }
    if (updates.priority !== undefined) {
      payload.priority = String(updates.priority).toUpperCase();
    }
    if (updates.dueDate !== undefined) payload.dueDate = updates.dueDate || null;
    if (updates.deadline !== undefined && updates.dueDate === undefined) payload.dueDate = updates.deadline || null;
    if (updates.scheduledDate !== undefined) payload.scheduledDate = updates.scheduledDate || null;
    if (updates.areaId !== undefined) payload.areaId = updates.areaId || null;
    if (updates.projectId !== undefined) payload.projectId = updates.projectId || null;
    if (updates.subProjectId !== undefined) payload.subProjectId = updates.subProjectId || null;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.order !== undefined) payload.order = updates.order;

    // Optimistic update
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...payload, updatedAt: new Date().toISOString() } : t))
    );

    try {
      const data = await apiClient.patch<any>(`/api/tasks/${id}`, payload);
      const normalized = normalizeTask(data);
      setTasks((prev) => prev.map((t) => (t.id === id ? normalized : t)));
      invalidateQueries(['dashboard', 'calendar', 'analytics']);
      return normalized;
    } catch (err: any) {
      console.error('Failed to update task:', err);
      setTasks(previousTasks); // Rollback
      throw err;
    }
  };

  const toggleTaskComplete = async (id: string): Promise<void> => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    const newStatus: TaskStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    await updateTask(id, { status: newStatus });
  };

  const deleteTask = async (id: string): Promise<void> => {
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await apiClient.delete(`/api/tasks/${id}`);
      invalidateQueries(['dashboard', 'calendar', 'analytics']);
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      setTasks(previousTasks); // Rollback
      throw err;
    }
  };

  const scheduleTask = async (id: string, scheduledDate: string | null): Promise<void> => {
    try {
      await apiClient.patch(`/api/tasks/${id}/schedule`, { scheduledDate });
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, scheduledDate } : t))
      );
      invalidateQueries(['dashboard', 'calendar']);
    } catch (err: any) {
      console.error('Failed to schedule task:', err);
      throw err;
    }
  };

  const reorderTasks = async (orderedIds: string[]): Promise<void> => {
    const previousTasks = [...tasks];
    const reordered = tasks.map((t) => {
      const idx = orderedIds.indexOf(t.id);
      if (idx !== -1) return { ...t, order: idx };
      return t;
    });
    setTasks(reordered);

    try {
      await apiClient.patch('/api/tasks/reorder', { orderedIds });
      invalidateQueries(['dashboard']);
    } catch (err: any) {
      console.error('Failed to save task ordering:', err);
      setTasks(previousTasks);
    }
  };

  const assignTask = async (
    id: string,
    areaId: string,
    projectId: string,
    subProjectId?: string,
    tags?: string[]
  ): Promise<Task> => {
    return updateTask(id, {
      areaId,
      projectId,
      subProjectId: subProjectId || null,
      ...(tags !== undefined ? { tags } : {}),
    });
  };

  return {
    tasks,
    items: tasks as any, // Backward-compatible alias
    isLoading,
    error,
    createTask,
    updateTask,
    deleteTask,
    assignTask,
    toggleTaskComplete,
    scheduleTask,
    reorderTasks,
    refreshTasks: fetchTasks,
  };
}

function normalizeTask(raw: any): Task & { content: string; completed: boolean; assignment: 'now' | 'later' } {
  const isCompleted = raw.status === 'COMPLETED' || Boolean(raw.completed);
  const title = raw.title || raw.content || 'Untitled Task';
  
  return {
    id: raw.id,
    title,
    content: title, // Backward compatibility for legacy BrainItem references
    description: raw.description || null,
    status: raw.status || (isCompleted ? 'COMPLETED' : 'TODO'),
    completed: isCompleted, // Backward compatibility
    completedAt: raw.completedAt || null,
    priority: raw.priority || 'NONE',
    dueDate: raw.dueDate ? raw.dueDate.split('T')[0] : null,
    scheduledDate: raw.scheduledDate ? raw.scheduledDate.split('T')[0] : null,
    order: raw.order !== undefined ? raw.order : 0,
    areaId: raw.areaId || null,
    projectId: raw.projectId || null,
    subProjectId: raw.subProjectId || null,
    area: raw.area ? { id: raw.area.id, name: raw.area.name } : (raw.areaName ? { id: raw.areaId, name: raw.areaName } : null),
    project: raw.project ? { id: raw.project.id, name: raw.project.name } : (raw.projectName ? { id: raw.projectId, name: raw.projectName } : null),
    subProject: raw.subProject ? { id: raw.subProject.id, name: raw.subProject.name } : null,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t: any) => (typeof t === 'string' ? t : t.name))
      : [],
    assignment: (raw.areaId || raw.projectId) ? 'now' : 'later', // Backward compatibility
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}
