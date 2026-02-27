import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json([], { status: 200 });
  }

  const saved = await prisma.save.findMany({
    where: { userId: session.user.id },
    include: {
      article: {
        include: {
          perspective: true,
          topic: {
            select: { id: true, title: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(saved);
}
