import { prisma } from "@/lib/prisma";

export type DeleteMode = "delete" | "unassign";

export async function deleteArea(id: string, mode: DeleteMode = "delete") {
  const projects = await prisma.project.findMany({
    where: {
      areaId: id,
    },
    select: {
      id: true,
    },
  });

  const projectIds = projects.map((project: any) => project.id);

  const subProjects = await prisma.subProject.findMany({
    where: {
      projectId: {
        in: projectIds,
      },
    },
    select: {
      id: true,
    },
  });

  const subProjectIds = subProjects.map((subProject: any) => subProject.id);

  const inboxItems = await prisma.inboxItem.findMany({
    where: {
      areaId: id,
    },
    select: {
      id: true,
    },
  });

  const inboxItemIds = inboxItems.map((item: any) => item.id);

  if (mode === "delete") {
    await prisma.$transaction([
      prisma.task.deleteMany({
        where: {
          inboxItemId: {
            in: inboxItemIds,
          },
        },
      }),
      prisma.inboxItem.deleteMany({
        where: {
          id: {
            in: inboxItemIds,
          },
        },
      }),
      prisma.subProject.deleteMany({
        where: {
          id: {
            in: subProjectIds,
          },
        },
      }),
      prisma.project.deleteMany({
        where: {
          id: {
            in: projectIds,
          },
        },
      }),
      prisma.area.delete({
        where: {
          id,
        },
      }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.inboxItem.updateMany({
      where: {
        areaId: id,
      },
      data: {
        assigned: false,
        areaId: null,
        projectId: null,
        subProjectId: null,
      },
    }),
    prisma.subProject.deleteMany({
      where: {
        id: {
          in: subProjectIds,
        },
      },
    }),
    prisma.project.deleteMany({
      where: {
        id: {
          in: projectIds,
        },
      },
    }),
    prisma.area.delete({
      where: {
        id,
      },
    }),
  ]);
}

export async function deleteProject(id: string, mode: DeleteMode = "delete") {
  const subProjects = await prisma.subProject.findMany({
    where: {
      projectId: id,
    },
    select: {
      id: true,
    },
  });

  const subProjectIds = subProjects.map((subProject: any) => subProject.id);

  const inboxItems = await prisma.inboxItem.findMany({
    where: {
      projectId: id,
    },
    select: {
      id: true,
    },
  });

  const inboxItemIds = inboxItems.map((item: any) => item.id);

  if (mode === "delete") {
    await prisma.$transaction([
      prisma.task.deleteMany({
        where: {
          inboxItemId: {
            in: inboxItemIds,
          },
        },
      }),
      prisma.inboxItem.deleteMany({
        where: {
          id: {
            in: inboxItemIds,
          },
        },
      }),
      prisma.subProject.deleteMany({
        where: {
          id: {
            in: subProjectIds,
          },
        },
      }),
      prisma.project.delete({
        where: {
          id,
        },
      }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.inboxItem.updateMany({
      where: {
        projectId: id,
      },
      data: {
        assigned: false,
        areaId: null,
        projectId: null,
        subProjectId: null,
      },
    }),
    prisma.subProject.deleteMany({
      where: {
        id: {
          in: subProjectIds,
        },
      },
    }),
    prisma.project.delete({
      where: {
        id,
      },
    }),
  ]);
}

export async function deleteSubProject(id: string, mode: DeleteMode = "delete") {
  const inboxItems = await prisma.inboxItem.findMany({
    where: {
      subProjectId: id,
    },
    select: {
      id: true,
    },
  });

  const inboxItemIds = inboxItems.map((item: any) => item.id);

  if (mode === "delete") {
    await prisma.$transaction([
      prisma.task.deleteMany({
        where: {
          inboxItemId: {
            in: inboxItemIds,
          },
        },
      }),
      prisma.inboxItem.deleteMany({
        where: {
          id: {
            in: inboxItemIds,
          },
        },
      }),
      prisma.subProject.delete({
        where: {
          id,
        },
      }),
    ]);
    return;
  }

  await prisma.$transaction([
    prisma.inboxItem.updateMany({
      where: {
        subProjectId: id,
      },
      data: {
        assigned: false,
        areaId: null,
        projectId: null,
        subProjectId: null,
      },
    }),
    prisma.subProject.delete({
      where: {
        id,
      },
    }),
  ]);
}
