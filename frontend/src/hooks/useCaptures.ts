import { useState, useEffect, useCallback } from 'react';
import { Capture, CaptureType } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQueryCoordinator, useQuerySubscriber } from '../context/QueryCoordinator';

export interface PromoteCaptureOptions {
  targetType?: 'TASK' | 'NOTE' | 'HABIT';
  target?: 'TASK' | 'NOTE' | 'HABIT';
  title?: string;
  description?: string;
  content?: string;
  priority?: string;
  dueDate?: string | null;
  scheduledDate?: string | null;
  areaId?: string | null;
  projectId?: string | null;
  subProjectId?: string | null;
  tags?: string[];
  frequency?: string;
  targetDaysPerWeek?: number | null;
}

export function useCaptures() {
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [trashedCaptures, setTrashedCaptures] = useState<Capture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { invalidateQueries } = useQueryCoordinator();

  const fetchCaptures = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<Capture[]>('/api/inbox', { params: { status: 'INBOX' } });
      setCaptures(data || []);
    } catch (err: any) {
      console.error('Failed to fetch inbox captures:', err);
      setError(err.message || 'Failed to fetch captures');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchTrashed = useCallback(async () => {
    try {
      const data = await apiClient.get<Capture[]>('/api/inbox', { params: { status: 'TRASHED' } });
      setTrashedCaptures(data || []);
    } catch (err: any) {
      console.error('Failed to fetch trashed captures:', err);
    }
  }, []);

  useEffect(() => {
    fetchCaptures();
  }, [fetchCaptures]);

  useQuerySubscriber('captures', fetchCaptures);

  const createCapture = async (rawContent: string, type: CaptureType = 'TASK'): Promise<Capture> => {
    try {
      const newCapture = await apiClient.post<Capture>('/api/inbox', {
        rawContent,
        type,
      });
      setCaptures((prev) => [newCapture, ...prev]);
      invalidateQueries(['dashboard']);
      return newCapture;
    } catch (err: any) {
      console.error('Failed to create capture:', err);
      throw err;
    }
  };

  const promoteCapture = async (id: string, options: PromoteCaptureOptions) => {
    try {
      const payload: any = {
        ...options,
        target: (options.target || options.targetType || 'TASK').toUpperCase(),
      };
      const res = await apiClient.post<{ success: boolean; task?: any; note?: any; habit?: any; capture?: any }>(
        `/api/inbox/${id}/promote`,
        payload
      );
      // Remove from active inbox captures
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      invalidateQueries(['tasks', 'notes', 'habits', 'dashboard', 'calendar']);
      return res;
    } catch (err: any) {
      console.error('Failed to promote capture:', err);
      throw err;
    }
  };

  const trashCapture = async (id: string) => {
    try {
      await apiClient.delete(`/api/inbox/${id}/trash`);
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      invalidateQueries(['dashboard']);
    } catch (err: any) {
      console.error('Failed to trash capture:', err);
      throw err;
    }
  };

  const restoreCapture = async (id: string) => {
    try {
      await apiClient.patch(`/api/inbox/${id}/restore`);
      setTrashedCaptures((prev) => prev.filter((c) => c.id !== id));
      await fetchCaptures();
      invalidateQueries(['dashboard']);
    } catch (err: any) {
      console.error('Failed to restore capture:', err);
      throw err;
    }
  };

  const deletePermanent = async (id: string) => {
    try {
      await apiClient.delete(`/api/inbox/${id}`);
      setTrashedCaptures((prev) => prev.filter((c) => c.id !== id));
      setCaptures((prev) => prev.filter((c) => c.id !== id));
      invalidateQueries(['dashboard']);
    } catch (err: any) {
      console.error('Failed to delete capture permanently:', err);
      throw err;
    }
  };

  return {
    captures,
    trashedCaptures,
    isLoading,
    error,
    createCapture,
    promoteCapture,
    trashCapture,
    restoreCapture,
    deletePermanent,
    refreshCaptures: fetchCaptures,
    fetchTrashed,
  };
}
