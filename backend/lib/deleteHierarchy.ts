import { prisma } from "@/lib/prisma";

export type ProjectDeletePolicy = "preserve" | "destructive";

export interface DeleteAreaResult {
  success: boolean;
  error?: string;
  code?: string;
  counts?: {
    projects: number;
    tasks: number;
    notes: number;
    habits: number;
  };
  deletedId?: string;
}

export interface DeleteProjectResult {
  success: boolean;
  error?: string;
  deletedId?: string;
  policy?: ProjectDeletePolicy;
  unassignedTasksCount?: number;
  unassignedNotesCount?: number;
  deletedTasksCount?: number;
  deletedNotesCount?: number;
}

export interface DeleteSubProjectResult {
  success: boolean;
  error?: string;
  deletedId?: string;
  reassignedToProjectId?: string;
  promotedTasksCount?: number;
  promotedNotesCount?: number;
}

/**
 * Deletes an Area under the strict Decision 02 guardrail:
 * An Area CANNOT be deleted if it contains any Projects, direct Tasks, direct Notes, or Habits.
 * Automatic cascading deletion or silent unassignment is strictly prohibited.
 */
export async function deleteArea(
  userId: string,
  areaId: string
): Promise<DeleteAreaResult> {
  // 1. Verify existence and ownership
  const existingArea = await prisma.area.findFirst({
    where: { id: areaId, userId },
  });

  if (!existingArea) {
    return {
      success: false,
      error: "Area not found or access denied",
      code: "NOT_FOUND",
    };
  }

  // 2. Count all associated objects in parallel
  const [projectCount, taskCount, noteCount, habitCount] = await Promise.all([
    prisma.project.count({ where: { areaId, userId } }),
    prisma.task.count({ where: { areaId, userId } }),
    prisma.note.count({ where: { areaId, userId } }),
    prisma.habit.count({ where: { areaId, userId } }),
  ]);

  const totalChildren = projectCount + taskCount + noteCount + habitCount;

  if (totalChildren > 0) {
    return {
      success: false,
      error:
        "Cannot delete Area: Area contains existing items. Please reassign or remove all projects, tasks, notes, and habits before deleting this area.",
      code: "AREA_NOT_EMPTY",
      counts: {
        projects: projectCount,
        tasks: taskCount,
        notes: noteCount,
        habits: habitCount,
      },
    };
  }

  // 3. Atomically delete empty area
  await prisma.area.delete({
    where: { id: areaId },
  });

  return {
    success: true,
    deletedId: areaId,
  };
}

/**
 * Deletes a Project under Decision 06 with an explicit policy:
 * - 'preserve': Unassigns all Tasks and Notes (areaId=null, projectId=null, subProjectId=null),
 *               deletes Subprojects, and deletes the Project.
 * - 'destructive': Deletes all Tasks and Notes in the Project/Subprojects,
 *                  deletes Subprojects, and deletes the Project.
 *
 * Habits are completely unaffected (Habits never attach to Projects per Decision 09).
 */
export async function deleteProject(
  userId: string,
  projectId: string,
  policy: ProjectDeletePolicy
): Promise<DeleteProjectResult> {
  // 1. Verify existence and ownership
  const existingProject = await prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      subProjects: {
        select: { id: true },
      },
    },
  });

  if (!existingProject) {
    return {
      success: false,
      error: "Project not found or access denied",
    };
  }

  const subProjectIds = existingProject.subProjects.map((sp) => sp.id);

  if (policy === "preserve") {
    // Transaction: unassign all child tasks/notes, delete subprojects, delete project
    await prisma.$transaction(async (tx) => {
      // 1. Unassign Tasks belonging to this project or its subprojects
      await tx.task.updateMany({
        where: {
          userId,
          OR: [
            { projectId },
            ...(subProjectIds.length > 0
              ? [{ subProjectId: { in: subProjectIds } }]
              : []),
          ],
        },
        data: {
          areaId: null,
          projectId: null,
          subProjectId: null,
        },
      });

      // 2. Unassign Notes belonging to this project or its subprojects
      await tx.note.updateMany({
        where: {
          userId,
          OR: [
            { projectId },
            ...(subProjectIds.length > 0
              ? [{ subProjectId: { in: subProjectIds } }]
              : []),
          ],
        },
        data: {
          areaId: null,
          projectId: null,
          subProjectId: null,
        },
      });

      // 3. Delete Subprojects
      if (subProjectIds.length > 0) {
        await tx.subProject.deleteMany({
          where: {
            projectId,
            userId,
          },
        });
      }

      // 4. Delete Project
      await tx.project.delete({
        where: { id: projectId },
      });
    });

    return {
      success: true,
      deletedId: projectId,
      policy: "preserve",
    };
  }

  if (policy === "destructive") {
    // Transaction: delete all child tasks/notes, delete subprojects, delete project
    await prisma.$transaction(async (tx) => {
      // 1. Delete Tasks belonging to this project or its subprojects
      await tx.task.deleteMany({
        where: {
          userId,
          OR: [
            { projectId },
            ...(subProjectIds.length > 0
              ? [{ subProjectId: { in: subProjectIds } }]
              : []),
          ],
        },
      });

      // 2. Delete Notes belonging to this project or its subprojects
      await tx.note.deleteMany({
        where: {
          userId,
          OR: [
            { projectId },
            ...(subProjectIds.length > 0
              ? [{ subProjectId: { in: subProjectIds } }]
              : []),
          ],
        },
      });

      // 3. Delete Subprojects
      if (subProjectIds.length > 0) {
        await tx.subProject.deleteMany({
          where: {
            projectId,
            userId,
          },
        });
      }

      // 4. Delete Project
      await tx.project.delete({
        where: { id: projectId },
      });
    });

    return {
      success: true,
      deletedId: projectId,
      policy: "destructive",
    };
  }

  return {
    success: false,
    error: "Invalid deletion policy. Must be 'preserve' or 'destructive'.",
  };
}

/**
 * Deletes a Subproject under Decision 06 with transactional task/note promotion:
 * All Tasks and Notes assigned to this Subproject are re-parented to the parent Project:
 * subProjectId = null, projectId = parentProjectId.
 * Zero content is deleted or unassigned from the Project.
 */
export async function deleteSubProject(
  userId: string,
  subProjectId: string
): Promise<DeleteSubProjectResult> {
  // 1. Verify existence and ownership
  const existingSubProject = await prisma.subProject.findFirst({
    where: { id: subProjectId, userId },
  });

  if (!existingSubProject) {
    return {
      success: false,
      error: "SubProject not found or access denied",
    };
  }

  const parentProjectId = existingSubProject.projectId;

  // 2. Transactionally reassign all tasks/notes to the parent project, then delete subproject
  await prisma.$transaction(async (tx) => {
    // Reassign Tasks to parent project
    await tx.task.updateMany({
      where: { subProjectId, userId },
      data: {
        subProjectId: null,
        projectId: parentProjectId,
        areaId: null,
      },
    });

    // Reassign Notes to parent project
    await tx.note.updateMany({
      where: { subProjectId, userId },
      data: {
        subProjectId: null,
        projectId: parentProjectId,
        areaId: null,
      },
    });

    // Delete the SubProject row
    await tx.subProject.delete({
      where: { id: subProjectId },
    });
  });

  return {
    success: true,
    deletedId: subProjectId,
    reassignedToProjectId: parentProjectId,
  };
}
