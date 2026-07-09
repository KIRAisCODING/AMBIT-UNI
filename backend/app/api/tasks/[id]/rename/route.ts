import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
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

  const body = await req.json();

  await prisma.inboxItem.update({
    where: {
      id,
    },
    data: {
      content: body.content,
    },
  });

  return NextResponse.json({
    success: true,
  });
}