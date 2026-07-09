import { auth } from "@/auth";
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
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  // Verify ownership of the inbox item
  const existingItem = await prisma.inboxItem.findFirst({
    where: { id, userId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  await prisma.task.deleteMany({
    where: {
      inboxItemId: id,
      userId,
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
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: {
      inboxItemId: id,
      userId,
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const { id } = await params;

  // Verify ownership of the inbox item
  const existingItem = await prisma.inboxItem.findFirst({
    where: { id, userId },
  });
  if (!existingItem) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const body = await req.json();

  const task = await prisma.task.upsert({
    where: {
      inboxItemId: id,
    },
    update: {
      description: body.description,
      deadline: body.deadline ? new Date(body.deadline) : null,
      completed: body.completed,
    },
    create: {
      inboxItemId: id,
      description: body.description,
      deadline: body.deadline ? new Date(body.deadline) : null,
      completed: body.completed,
      userId,
    },
  });

  return NextResponse.json(task);
}