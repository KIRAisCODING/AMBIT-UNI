import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json();

  // Verify ownership of the inbox item
  const existingItem = await prisma.inboxItem.findFirst({
    where: { id: body.inboxItemId, userId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const existingTask = await prisma.task.findUnique({
    where: { inboxItemId: body.inboxItemId },
  });

  let completedAt = null;
  if (body.completed) {
    completedAt = existingTask?.completed ? existingTask.completedAt : new Date();
  }

  const task = await prisma.task.upsert({
    where: {
      inboxItemId: body.inboxItemId,
    },
    update: {
      description: body.description,
      deadline: body.deadline ? new Date(body.deadline) : null,
      completed: body.completed,
      completedAt,
    },
    create: {
      inboxItemId: body.inboxItemId,
      description: body.description,
      deadline: body.deadline ? new Date(body.deadline) : null,
      completed: body.completed,
      completedAt,
      userId,
    },
  });

  return NextResponse.json(task);
}