import { useAreas } from './useAreas';

export function useProjects() {
  const { createProject, deleteProject, createSubProject, deleteSubProject } = useAreas();

  return {
    createProject,
    deleteProject,
    createSubProject,
    deleteSubProject,
  };
}
