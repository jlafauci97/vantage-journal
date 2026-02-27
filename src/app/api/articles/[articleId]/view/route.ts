import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { articleId } = await params;
  const session = await auth();
  const userId = session?.user?.id || null;

  if (userId) {
    const existing = await prisma.articleView.findUnique({
      where: { articleId_userId: { articleId, userId } },
    });
    if (!existing) {
      await prisma.articleView.create({ data: { articleId, userId } });
      await prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      });
    }
  } else {
    await prisma.article.update({
      where: { id: articleId },
      data: { viewCount: { increment: 1 } },
    });
  }

  return NextResponse.json({ ok: true });
}
