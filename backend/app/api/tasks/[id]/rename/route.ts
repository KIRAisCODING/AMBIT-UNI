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

  const { id } =
    await params;

  const body =
    await req.json();

  await prisma.inboxItem.update({

    where: {
      id,
    },

    data: {
      content:
        body.content,
    },

  });

  return NextResponse.json({
    success: true,
  });
}