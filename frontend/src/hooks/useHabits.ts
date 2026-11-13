import { useState, useEffect, useCallback } from 'react';
import { Habit } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQueryCoordinator, useQuerySubscriber } from '../context/QueryCoordinator';

export interface CreateHabitInput {
  name: string;
  frequency?: 'daily' | 'weekly' | 'DAILY' | 'WEEKLY';
  targetDaysPerWeek?: number | null;
  areaId?: string | null;
  notes?: string;
  // Legacy signature parameters for backwards compatibility
  area?: string;
  project?: string;
  subProject?: string;
}

export function useHabits(filterParams?: { areaId?: string }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { invalidateQueries } = useQueryCoordinator();

  const fetchHabits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<any[]>('/api/habits', { params: filterParams });
      setHabits((data || []).map(mapBackendHabitToFrontend));
    } catch (err: any) {
      console.error('Failed to load habits:', err);
      setError(err.message || 'Failed to load habits');
    } finally {
      setIsLoading(false);
    }
  }, [filterParams?.areaId]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  useQuerySubscriber('habits', fetchHabits);

  const addHabit = async (
    nameOrInput: string | CreateHabitInput,
    frequencyArg?: 'daily' | 'weekly' | 'DAILY' | 'WEEKLY',
    _project?: string,
    area?: string,
    _subProject?: string
  ): Promise<Habit> => {
    let name = '';
    let frequency: 'DAILY' | 'WEEKLY' = 'DAILY';
    let targetDaysPerWeek: number | null = null;
    let areaId: string | null = null;
    let notes: string | undefined = undefined;

    if (typeof nameOrInput === 'string') {
      name = nameOrInput.trim();
      if (frequencyArg) {
        frequency = frequencyArg.toUpperCase() as 'DAILY' | 'WEEKLY';
      }
      // Note: project and subproject are intentionally ignored per Architecture Decision 01 & 06
      if (area) {
        // If area looks like a cuid/uuid or name, pass as areaId / area
        areaId = area;
      }
    } else {
      name = nameOrInput.name.trim();
      frequency = (nameOrInput.frequency || 'DAILY').toUpperCase() as 'DAILY' | 'WEEKLY';
      targetDaysPerWeek = nameOrInput.targetDaysPerWeek || null;
      areaId = nameOrInput.areaId || (nameOrInput.area ? nameOrInput.area : null);
      notes = nameOrInput.notes;
    }

    const payload: any = {
      name,
      frequency,
      targetDaysPerWeek,
      notes,
    };
    if (areaId) {
      payload.areaId = areaId;
    }

    try {
      const data = await apiClient.post<any>('/api/habits', payload);
      const mapped = mapBackendHabitToFrontend(data);
      setHabits((prev) => [mapped, ...prev]);
      invalidateQueries(['habits', 'dashboard', 'calendar', 'analytics']);
      return mapped;
    } catch (err: any) {
      console.error('Failed to add habit:', err);
      throw err;
    }
  };

  const toggleHabitDay = async (id: string, dateStr: string): Promise<void> => {
    const target = habits.find((h) => h.id === id);
    if (!target) return;

    // Optimistic toggle
    const wasCompleted = Boolean(target.completedToday);
    const newStreak = wasCompleted
      ? Math.max(0, target.streak - 1)
      : target.streak + 1;

    setHabits((prev) =>
      prev.map((h) =>
        h.id === id
          ? {
              ...h,
              completedToday: !wasCompleted,
              streak: newStreak,
              currentStreak: newStreak,
            }
          : h
      )
    );

    try {
      const data = await apiClient.post<any>(`/api/habits/${id}/toggle`, { date: dateStr });
      const mapped = mapBackendHabitToFrontend(data);
      setHabits((prev) => prev.map((h) => (h.id === id ? mapped : h)));
      invalidateQueries(['habits', 'dashboard', 'calendar', 'analytics']);
    } catch (err: any) {
      console.error('Failed to toggle habit:', err);
      // Rollback
      setHabits((prev) => prev.map((h) => (h.id === id ? target : h)));
      throw err;
    }
  };

  const deleteHabit = async (id: string): Promise<void> => {
    const previous = [...habits];
    setHabits((prev) => prev.filter((h) => h.id !== id));

    try {
      await apiClient.delete(`/api/habits/${id}`);
      invalidateQueries(['habits', 'dashboard', 'calendar', 'analytics']);
    } catch (err: any) {
      console.error('Failed to delete habit:', err);
      setHabits(previous);
      throw err;
    }
  };

  const updateHabit = async (id: string, updates: Partial<Habit>): Promise<Habit> => {
    // Sanitize updates to prevent sending project/subProject
    const payload: any = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.frequency !== undefined) payload.frequency = String(updates.frequency).toUpperCase();
    if (updates.targetDaysPerWeek !== undefined) payload.targetDaysPerWeek = updates.targetDaysPerWeek;
    if (updates.areaId !== undefined) payload.areaId = updates.areaId;
    if (updates.notes !== undefined) payload.notes = updates.notes;

    const previous = [...habits];
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...payload } : h))
    );

    try {
      const data = await apiClient.patch<any>(`/api/habits/${id}`, payload);
      const mapped = mapBackendHabitToFrontend(data);
      setHabits((prev) => prev.map((h) => (h.id === id ? mapped : h)));
      invalidateQueries(['habits', 'dashboard', 'calendar', 'analytics']);
      return mapped;
    } catch (err: any) {
      console.error('Failed to update habit:', err);
      setHabits(previous);
      throw err;
    }
  };

  return {
    habits,
    isLoading,
    error,
    addHabit,
    toggleHabitDay,
    deleteHabit,
    updateHabit,
    refreshHabits: fetchHabits,
  };
}

function mapBackendHabitToFrontend(habit: any): Habit {
  const areaName = habit.area ? habit.area.name : (habit.areaName || undefined);
  const areaId = habit.areaId || (habit.area ? habit.area.id : undefined);

  return {
    id: habit.id,
    name: habit.name,
    description: habit.description || undefined,
    frequency: habit.frequency || 'DAILY',
    streak: habit.streak || habit.currentStreak || 0,
    currentStreak: habit.currentStreak || habit.streak || 0,
    longestStreak: habit.longestStreak || 0,
    completedToday: Boolean(habit.completedToday),
    completedDays: Array.isArray(habit.completedDays) ? habit.completedDays : [],
    targetDaysPerWeek: habit.targetDaysPerWeek || null,
    createdAt: habit.createdAt || new Date().toISOString(),
    updatedAt: habit.updatedAt || new Date().toISOString(),
    area: areaName,
    areaId: areaId || null,
    project: undefined,
    subProject: undefined,
    notes: habit.notes || '',
    weeklyProgress: habit.weeklyProgress || null,
  };
}
