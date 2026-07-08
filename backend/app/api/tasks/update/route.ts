import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request
) {

  const body =
  await req.json();

console.log(body);

  const task =
    await prisma.task.upsert({

      where: {
        inboxItemId:
          body.inboxItemId,
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

        inboxItemId:
          body.inboxItemId,

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

  return NextResponse.json(
    task
  );
}