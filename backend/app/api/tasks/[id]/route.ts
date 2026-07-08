import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {

  const { id } =
    await params;

  await prisma.task.deleteMany({

    where: {
      inboxItemId: id,
    },

  });

  await prisma.inboxItem.delete({

    where: {
      id,
    },

  });

  return NextResponse.json({
    success: true,
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;

  const task =
    await prisma.task.findUnique({
      where: {
        inboxItemId: id,
      },
    });

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const { id } = await params;

  const body = await req.json();

  const task =
    await prisma.task.upsert({

      where: {
        inboxItemId: id,
      },

      update: {
        description:
          body.description,

        deadline:
          body.deadline
            ? new Date(
                body.deadline
              )
            : null,

        completed:
          body.completed,
      },

      create: {
        inboxItemId: id,

        description:
          body.description,

        deadline:
          body.deadline
            ? new Date(
                body.deadline
              )
            : null,

        completed:
          body.completed,
      },
    });

  return NextResponse.json(task);
}