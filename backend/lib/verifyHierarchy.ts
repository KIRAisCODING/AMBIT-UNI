import { prisma } from "./prisma";

export async function verifyHierarchy(
  userId: string,
  areaId: string | null | undefined,
  projectId: string | null | undefined,
  subProjectId: string | null | undefined
): Promise<{ isValid: boolean; error?: string }> {
  // 1. Verify Area if provided
  if (areaId) {
    const area = await prisma.area.findFirst({
      where: { id: areaId, userId },
    });
    if (!area) {
      return { isValid: false, error: "Area not found or access denied" };
    }
  }

  // 2. Verify Project if provided
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });
    if (!project) {
      return { isValid: false, error: "Project not found or access denied" };
    }

    // Verify consistency: Project must belong to the selected Area if both are specified
    if (areaId && project.areaId !== areaId) {
      return { isValid: false, error: "Project hierarchy mismatch: Project does not belong to the selected Area" };
    }
  }

  // 3. Verify SubProject if provided
  if (subProjectId) {
    const subProject = await prisma.subProject.findFirst({
      where: { id: subProjectId, userId },
    });
    if (!subProject) {
      return { isValid: false, error: "SubProject not found or access denied" };
    }

    // Verify consistency: SubProject must belong to the selected Project if both are specified
    if (projectId && subProject.projectId !== projectId) {
      return { isValid: false, error: "SubProject hierarchy mismatch: SubProject does not belong to the selected Project" };
    }

    // Verify consistency with Area if Area is specified
    if (areaId) {
      const parentProject = await prisma.project.findFirst({
        where: { id: subProject.projectId, userId },
      });
      if (!parentProject || parentProject.areaId !== areaId) {
        return { isValid: false, error: "SubProject hierarchy mismatch: SubProject does not belong to the selected Area" };
      }
    }
  }

  return { isValid: true };
}
