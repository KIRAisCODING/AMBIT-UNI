import { useState, useEffect, useRef, useCallback } from 'react';
import { AreaHierarchy } from '../types';
import { apiClient } from '../lib/apiClient';

export function useAreas() {
  const [hierarchy, setHierarchy] = useState<AreaHierarchy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rawHierarchyRef = useRef<any[]>([]);

  const fetchHierarchy = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiClient.get<any[]>('/api/sidebar');
      rawHierarchyRef.current = data || [];
      const mapped: AreaHierarchy[] = (data || []).map((area: any) => ({
        id: area.id,
        name: area.name,
        projects: (area.projects || []).map((proj: any) => ({
          id: proj.id,
          areaId: area.id,
          name: proj.name,
          subProjects: (proj.subProjects || []).map((sp: any) => ({
            id: sp.id,
            projectId: proj.id,
            name: sp.name,
          })),
        })),
      }));
      setHierarchy(mapped);
    } catch (err: any) {
      console.error('Failed to load hierarchy:', err);
      setError(err.message || 'Failed to load hierarchy');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const createArea = async (name: string) => {
    try {
      await apiClient.post('/api/areas', { name });
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Failed to create area:', err);
      throw err;
    }
  };

  const deleteArea = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.delete(`/api/areas/${id}`);
      await fetchHierarchy();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to delete area:', err);
      return { success: false, error: err.message || 'Failed to delete area' };
    }
  };

  const createProject = async (name: string, areaId: string) => {
    try {
      await apiClient.post('/api/projects', { name, areaId });
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Failed to create project:', err);
      throw err;
    }
  };

  const deleteProject = async (
    id: string,
    policy: 'preserve' | 'destructive' = 'preserve'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.delete(`/api/projects/${id}`, { params: { policy } });
      await fetchHierarchy();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      return { success: false, error: err.message || 'Failed to delete project' };
    }
  };

  const createSubProject = async (name: string, projectId: string) => {
    try {
      await apiClient.post('/api/subprojects', { name, projectId });
      await fetchHierarchy();
    } catch (err: any) {
      console.error('Failed to create subproject:', err);
      throw err;
    }
  };

  const deleteSubProject = async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.delete(`/api/subprojects/${id}`);
      await fetchHierarchy();
      return { success: true };
    } catch (err: any) {
      console.error('Failed to delete subproject:', err);
      return { success: false, error: err.message || 'Failed to delete subproject' };
    }
  };

  const updateHierarchy = async (newHierarchy: AreaHierarchy[]) => {
    const actions = {
      createArea,
      deleteArea,
      createProject,
      deleteProject,
      createSubProject,
      deleteSubProject,
    };
    await syncHierarchy(hierarchy, newHierarchy, rawHierarchyRef.current, actions);
    await fetchHierarchy();
  };

  return {
    hierarchy,
    isLoading,
    error,
    createArea,
    deleteArea,
    createProject,
    deleteProject,
    createSubProject,
    deleteSubProject,
    updateHierarchy,
    refreshHierarchy: fetchHierarchy,
  };
}

async function syncHierarchy(
  oldHierarchy: AreaHierarchy[],
  newHierarchy: AreaHierarchy[],
  rawHierarchy: any[],
  actions: any
) {
  // 1. Check for deleted Areas
  for (const oldArea of oldHierarchy) {
    if (!newHierarchy.some((a) => a.name === oldArea.name)) {
      const rawArea = rawHierarchy.find((a) => a.name === oldArea.name);
      if (rawArea) await actions.deleteArea(rawArea.id);
      return;
    }
  }

  // 2. Check for created Areas
  for (const newArea of newHierarchy) {
    if (!oldHierarchy.some((a) => a.name === newArea.name)) {
      await actions.createArea(newArea.name);
      return;
    }
  }

  // 3. Check for Project changes inside matched Areas
  for (const newArea of newHierarchy) {
    const oldArea = oldHierarchy.find((a) => a.name === newArea.name);
    if (!oldArea) continue;

    const rawArea = rawHierarchy.find((a) => a.name === newArea.name);
    if (!rawArea) continue;

    // Check for deleted Projects
    for (const oldProj of oldArea.projects) {
      if (!newArea.projects.some((p) => p.name === oldProj.name)) {
        const rawProj = rawArea.projects?.find((p: any) => p.name === oldProj.name);
        if (rawProj) await actions.deleteProject(rawProj.id);
        return;
      }
    }

    // Check for created Projects
    for (const newProj of newArea.projects) {
      if (!oldArea.projects.some((p) => p.name === newProj.name)) {
        await actions.createProject(newProj.name, rawArea.id);
        return;
      }
    }

    // Check for SubProject changes inside matched Projects
    for (const newProj of newArea.projects) {
      const oldProj = oldArea.projects.find((p) => p.name === newProj.name);
      if (!oldProj) continue;

      const rawProj = rawArea.projects?.find((p: any) => p.name === newProj.name);
      if (!rawProj) continue;

      // Check for deleted SubProjects
      for (const oldSub of oldProj.subProjects) {
        if (!newProj.subProjects.some((subProject) => subProject.name === oldSub.name)) {
          const rawSub = rawProj.subProjects?.find((sp: any) => sp.name === oldSub.name);
          if (rawSub) await actions.deleteSubProject(rawSub.id);
          return;
        }
      }

      // Check for created SubProjects
      for (const newSub of newProj.subProjects) {
        if (!oldProj.subProjects.some((subProject) => subProject.name === newSub.name)) {
          await actions.createSubProject(newSub.name, rawProj.id);
          return;
        }
      }
    }
  }
}
