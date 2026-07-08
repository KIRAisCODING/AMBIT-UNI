import { useState, useEffect } from 'react';
import { Habit } from '../types';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHabits = async () => {
    try {
      const res = await fetch('/api/habits');
      if (res.ok) {
        const data = await res.json();
        setHabits(data.map(mapBackendHabitToFrontend));
      }
    } catch (err) {
      console.error('Failed to load habits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const addHabit = async (
    name: string,
    frequency: 'daily' | 'weekly',
    project?: string,
    area?: string,
    subProject?: string
  ) => {
    try {
      const res = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          frequency,
          area,
          project,
          subProject,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setHabits(prev => [mapBackendHabitToFrontend(data), ...prev]);
      }
    } catch (err) {
      console.error('Failed to add habit:', err);
    }
  };

  const toggleHabitDay = async (id: string, dateStr: string) => {
    try {
      const res = await fetch(`/api/habits/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      if (res.ok) {
        const data = await res.json();
        setHabits(prev => prev.map(h => h.id === id ? mapBackendHabitToFrontend(data) : h));
      }
    } catch (err) {
      console.error('Failed to toggle habit:', err);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await fetch(`/api/habits/${id}`, {
        method: 'DELETE',
      });
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    try {
      const res = await fetch(`/api/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setHabits(prev => prev.map(h => h.id === id ? mapBackendHabitToFrontend(data) : h));
      }
    } catch (err) {
      console.error('Failed to update habit:', err);
    }
  };

  return {
    habits,
    isLoading,
    addHabit,
    toggleHabitDay,
    deleteHabit,
    updateHabit,
    refreshHabits: fetchHabits,
  };
}

function mapBackendHabitToFrontend(habit: any): Habit {
  return {
    id: habit.id,
    name: habit.name,
    frequency: habit.frequency as 'daily' | 'weekly',
    streak: habit.streak || 0,
    longestStreak: habit.longestStreak || 0,
    completedDays: habit.completedDays || [],
    createdAt: habit.createdAt || new Date().toISOString(),
    area: habit.area || undefined,
    project: habit.project || undefined,
    subProject: habit.subProject || undefined,
    notes: habit.notes || '',
  };
}
