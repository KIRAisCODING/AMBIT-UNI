import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types';
import { apiClient } from '../lib/apiClient';
import { useQueryCoordinator, useQuerySubscriber } from '../context/QueryCoordinator';

export interface CreateNoteInput {
  title?: string | null;
  content: string;
  format?: string;
  areaId?: string | null;
  projectId?: string | null;
  subProjectId?: string | null;
  tags?: string[];
}

export function useNotes(filterParams?: { areaId?: string; projectId?: string; subProjectId?: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { invalidateQueries } = useQueryCoordinator();

  const fetchNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<Note[]>('/api/notes', { params: filterParams });
      setNotes(data || []);
    } catch (err: any) {
      console.error('Failed to fetch notes:', err);
      setError(err.message || 'Failed to fetch notes');
    } finally {
      setIsLoading(false);
    }
  }, [filterParams?.areaId, filterParams?.projectId, filterParams?.subProjectId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  useQuerySubscriber('notes', fetchNotes);

  const createNote = async (input: CreateNoteInput): Promise<Note> => {
    try {
      const newNote = await apiClient.post<Note>('/api/notes', input);
      setNotes((prev) => [newNote, ...prev]);
      invalidateQueries(['dashboard']);
      return newNote;
    } catch (err: any) {
      console.error('Failed to create note:', err);
      throw err;
    }
  };

  const updateNote = async (id: string, updates: Partial<CreateNoteInput>): Promise<Note> => {
    try {
      const updated = await apiClient.patch<Note>(`/api/notes/${id}`, updates);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      invalidateQueries(['dashboard']);
      return updated;
    } catch (err: any) {
      console.error('Failed to update note:', err);
      throw err;
    }
  };

  const deleteNote = async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      invalidateQueries(['dashboard']);
    } catch (err: any) {
      console.error('Failed to delete note:', err);
      throw err;
    }
  };

  const togglePin = async (id: string): Promise<void> => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;

    // Optimistic toggle
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );

    try {
      const res = await apiClient.patch<{ id: string; pinned: boolean }>(`/api/notes/${id}/pin`);
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, pinned: res.pinned } : n))
      );
    } catch (err: any) {
      console.error('Failed to toggle note pin:', err);
      // Rollback
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, pinned: target.pinned } : n))
      );
      throw err;
    }
  };

  const archiveNote = async (id: string): Promise<void> => {
    try {
      await apiClient.patch(`/api/notes/${id}/archive`);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err: any) {
      console.error('Failed to archive note:', err);
      throw err;
    }
  };

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
    archiveNote,
    refreshNotes: fetchNotes,
  };
}
