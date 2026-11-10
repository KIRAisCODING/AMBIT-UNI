import { prisma } from "./prisma";

export interface NormalizedHierarchy {
  areaId: string | null;
  projectId: string | null;
  subProjectId: string | null;
}

export interface TaskHierarchyValidationResult {
  isValid: boolean;
  error?: string;
  normalized: NormalizedHierarchy;
}

/**
 * Validates hierarchy ownership and consistency for Tasks (Decision 02 & 07).
 * Enforces exactly one direct placement level:
 * - Standalone: areaId = null, projectId = null, subProjectId = null
 * - Area: only areaId populated
 * - Project: only projectId populated
 * - Subproject: only subProjectId populated
 *
 * Verifies that the authenticated user owns all referenced hierarchy nodes
 * and that SubProjects correctly nest under Projects, and Projects under Areas.
 */
export async function verifyAndNormalizeTaskHierarchy(
  userId: string,
  input: {
    areaId?: string | null;
    projectId?: string | null;
    subProjectId?: string | null;
  }
): Promise<TaskHierarchyValidationResult> {
  const { areaId, projectId, subProjectId } = input;
  const emptyNormalized: NormalizedHierarchy = {
    areaId: null,
    projectId: null,
    subProjectId: null,
  };

  // 1. If SubProject is provided:
  if (subProjectId) {
    const subProject = await prisma.subProject.findFirst({
      where: { id: subProjectId, userId },
      include: {
        project: true,
      },
    });

    if (!subProject) {
      return {
        isValid: false,
        error: "SubProject not found or access denied",
        normalized: emptyNormalized,
      };
    }

    // If projectId was also supplied, assert consistency
    if (projectId && subProject.projectId !== projectId) {
      return {
        isValid: false,
        error: "SubProject hierarchy mismatch: SubProject does not belong to the selected Project",
        normalized: emptyNormalized,
      };
    }

    // If areaId was also supplied, assert consistency with the parent Project's Area
    if (areaId && subProject.project.areaId !== areaId) {
      return {
        isValid: false,
        error: "SubProject hierarchy mismatch: SubProject's parent Project does not belong to the selected Area",
        normalized: emptyNormalized,
      };
    }

    // Exactly one direct placement: SubProject level only
    return {
      isValid: true,
      normalized: {
        areaId: null,
        projectId: null,
        subProjectId: subProject.id,
      },
    };
  }

  // 2. If Project is provided (and no SubProject):
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return {
        isValid: false,
        error: "Project not found or access denied",
        normalized: emptyNormalized,
      };
    }

    // If areaId was also supplied, assert consistency
    if (areaId && project.areaId !== areaId) {
      return {
        isValid: false,
        error: "Project hierarchy mismatch: Project does not belong to the selected Area",
        normalized: emptyNormalized,
      };
    }

    // Exactly one direct placement: Project level only
    return {
      isValid: true,
      normalized: {
        areaId: null,
        projectId: project.id,
        subProjectId: null,
      },
    };
  }

  // 3. If Area is provided (and no Project or SubProject):
  if (areaId) {
    const area = await prisma.area.findFirst({
      where: { id: areaId, userId },
    });

    if (!area) {
      return {
        isValid: false,
        error: "Area not found or access denied",
        normalized: emptyNormalized,
      };
    }

    // Exactly one direct placement: Area level only
    return {
      isValid: true,
      normalized: {
        areaId: area.id,
        projectId: null,
        subProjectId: null,
      },
    };
  }

  // 4. Standalone (no hierarchy assigned)
  return {
    isValid: true,
    normalized: emptyNormalized,
  };
}

/**
 * Validates hierarchy ownership for Habits (Decision 09).
 * Habits can ONLY link to an Area or remain standalone.
 * Linking a Habit to a Project or SubProject is strictly rejected.
 */
export async function verifyHabitHierarchy(
  userId: string,
  areaId: string | null | undefined,
  projectId?: string | null,
  subProjectId?: string | null
): Promise<{ isValid: boolean; error?: string }> {
  if (projectId || subProjectId) {
    return {
      isValid: false,
      error: "Habits can only be assigned to an Area or remain standalone. Linking habits to Projects or SubProjects is not permitted.",
    };
  }

  if (areaId) {
    const area = await prisma.area.findFirst({
      where: { id: areaId, userId },
    });
    if (!area) {
      return { isValid: false, error: "Area not found or access denied" };
    }
  }

  return { isValid: true };
}

/**
 * Backward-compatible hierarchy verification for legacy callers.
 */
export async function verifyHierarchy(
  userId: string,
  areaId: string | null | undefined,
  projectId: string | null | undefined,
  subProjectId: string | null | undefined
): Promise<{ isValid: boolean; error?: string }> {
  const result = await verifyAndNormalizeTaskHierarchy(userId, {
    areaId,
    projectId,
    subProjectId,
  });
  return {
    isValid: result.isValid,
    error: result.error,
  };
}
