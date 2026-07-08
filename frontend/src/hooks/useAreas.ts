import { useState, useEffect, useRef } from 'react';
import { AreaHierarchy } from '../types';

export function useAreas() {
  const [hierarchy, setHierarchy] = useState<AreaHierarchy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const rawHierarchyRef = useRef<any[]>([]);

  const fetchHierarchy = async () => {
    try {
      const res = await fetch('/api/sidebar');
      if (res.ok) {
        const data = await res.json();
        rawHierarchyRef.current = data;
        const mapped = data.map((area: any) => ({
          name: area.name,
          projects: (area.projects || []).map((proj: any) => ({
            name: proj.name,
            subProjects: (proj.subProjects || []).map((sp: any) => sp.name),
          })),
        }));
        setHierarchy(mapped);
      }
    } catch (err) {
      console.error('Failed to load hierarchy:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const createArea = async (name: string) => {
    await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    await fetchHierarchy();
  };

  const deleteArea = async (id: string) => {
    await fetch(`/api/areas/${id}?mode=delete`, {
      method: 'DELETE',
    });
    await fetchHierarchy();
  };

  const createProject = async (name: string, areaId: string) => {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, areaId }),
    });
    await fetchHierarchy();
  };

  const deleteProject = async (id: string) => {
    await fetch(`/api/projects/${id}?mode=delete`, {
      method: 'DELETE',
    });
    await fetchHierarchy();
  };

  const createSubProject = async (name: string, projectId: string) => {
    await fetch('/api/subprojects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, projectId }),
    });
    await fetchHierarchy();
  };

  const deleteSubProject = async (id: string) => {
    await fetch(`/api/subprojects/${id}?mode=delete`, {
      method: 'DELETE',
    });
    await fetchHierarchy();
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
  };

  return {
    hierarchy,
    isLoading,
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
    if (!newHierarchy.some(a => a.name === oldArea.name)) {
      const rawArea = rawHierarchy.find(a => a.name === oldArea.name);
      if (rawArea) await actions.deleteArea(rawArea.id);
      return;
    }
  }

  // 2. Check for created Areas
  for (const newArea of newHierarchy) {
    if (!oldHierarchy.some(a => a.name === newArea.name)) {
      await actions.createArea(newArea.name);
      return;
    }
  }

  // 3. Check for Project changes inside matched Areas
  for (const newArea of newHierarchy) {
    const oldArea = oldHierarchy.find(a => a.name === newArea.name);
    if (!oldArea) continue;

    const rawArea = rawHierarchy.find(a => a.name === newArea.name);
    if (!rawArea) continue;

    // Check for deleted Projects
    for (const oldProj of oldArea.projects) {
      if (!newArea.projects.some(p => p.name === oldProj.name)) {
        const rawProj = rawArea.projects?.find((p: any) => p.name === oldProj.name);
        if (rawProj) await actions.deleteProject(rawProj.id);
        return;
      }
    }

    // Check for created Projects
    for (const newProj of newArea.projects) {
      if (!oldArea.projects.some(p => p.name === newProj.name)) {
        await actions.createProject(newProj.name, rawArea.id);
        return;
      }
    }

    // Check for SubProject changes inside matched Projects
    for (const newProj of newArea.projects) {
      const oldProj = oldArea.projects.find(p => p.name === newProj.name);
      if (!oldProj) continue;

      const rawProj = rawArea.projects?.find((p: any) => p.name === newProj.name);
      if (!rawProj) continue;

      // Check for deleted SubProjects
      for (const oldSub of oldProj.subProjects) {
        if (!newProj.subProjects.includes(oldSub)) {
          const rawSub = rawProj.subProjects?.find((sp: any) => sp.name === oldSub);
          if (rawSub) await actions.deleteSubProject(rawSub.id);
          return;
        }
      }

      // Check for created SubProjects
      for (const newSub of newProj.subProjects) {
        if (!oldProj.subProjects.includes(newSub)) {
          await actions.createSubProject(newSub, rawProj.id);
          return;
        }
      }
    }
  }
}
