import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { articleId } = await params;

  const existing = await prisma.repost.findUnique({
    where: { userId_articleId: { userId: session.user.id, articleId } },
  });

  if (existing) {
    // Remove repost
    await prisma.$transaction([
      prisma.repost.delete({ where: { id: existing.id } }),
      prisma.article.update({
        where: { id: articleId },
        data: { repostCount: { decrement: 1 } },
      }),
    ]);
    return NextResponse.json({ reposted: false });
  }

  // Create repost and notify article author
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { authorId: true },
  });

  await prisma.$transaction([
    prisma.repost.create({
      data: { userId: session.user.id, articleId },
    }),
    prisma.article.update({
      where: { id: articleId },
      data: { repostCount: { increment: 1 } },
    }),
    ...(article?.authorId && article.authorId !== session.user.id
      ? [
          prisma.notification.create({
            data: {
              receiverId: article.authorId,
              senderId: session.user.id,
              type: "ARTICLE_REPOSTED",
              entityId: articleId,
            },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ reposted: true });
}
