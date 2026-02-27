import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { articleId } = await params;
  const userId = session.user.id;

  const existing = await prisma.like.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
    await prisma.article.update({
      where: { id: articleId },
      data: { likeCount: { decrement: 1 } },
    });
    return NextResponse.json({ liked: false });
  }

  await prisma.like.create({ data: { userId, articleId } });
  await prisma.article.update({
    where: { id: articleId },
    data: { likeCount: { increment: 1 } },
  });

  // Notify article author
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { authorId: true },
  });
  if (article?.authorId) {
    await createNotification({
      receiverId: article.authorId,
      senderId: userId,
      type: "ARTICLE_LIKED",
      entityId: articleId,
    });
  }

  return NextResponse.json({ liked: true });
}
