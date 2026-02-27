import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { articleId } = await params;
  const body = await req.json();
  const value = body.value === -1 ? -1 : 1;

  const existing = await prisma.vote.findUnique({
    where: { userId_articleId: { userId: session.user.id, articleId } },
  });

  if (existing) {
    if (existing.value === value) {
      // Remove vote (toggle off)
      await prisma.$transaction([
        prisma.vote.delete({
          where: { id: existing.id },
        }),
        prisma.article.update({
          where: { id: articleId },
          data: { voteScore: { decrement: value } },
        }),
      ]);
      return NextResponse.json({ voted: null });
    } else {
      // Switch vote direction
      await prisma.$transaction([
        prisma.vote.update({
          where: { id: existing.id },
          data: { value },
        }),
        prisma.article.update({
          where: { id: articleId },
          data: { voteScore: { increment: value * 2 } },
        }),
      ]);
      return NextResponse.json({ voted: value });
    }
  }

  // New vote
  await prisma.$transaction([
    prisma.vote.create({
      data: { userId: session.user.id, articleId, value },
    }),
    prisma.article.update({
      where: { id: articleId },
      data: { voteScore: { increment: value } },
    }),
  ]);

  return NextResponse.json({ voted: value });
}
