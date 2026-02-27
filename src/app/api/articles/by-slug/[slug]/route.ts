import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();

  const article = await prisma.article.findUnique({
    where: { slug },
    include: {
      perspective: {
        select: { id: true, name: true, slug: true, category: true, color: true },
      },
      topic: {
        select: { id: true, title: true, slug: true },
      },
      author: {
        select: { id: true, name: true, image: true },
      },
      _count: {
        select: { comments: true, likes: true, saves: true },
      },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check user interactions
  let isLiked = false;
  let isSaved = false;

  if (session?.user?.id) {
    const [like, save] = await Promise.all([
      prisma.like.findUnique({
        where: { userId_articleId: { userId: session.user.id, articleId: article.id } },
      }),
      prisma.save.findUnique({
        where: { userId_articleId: { userId: session.user.id, articleId: article.id } },
      }),
    ]);
    isLiked = !!like;
    isSaved = !!save;
  }

  return NextResponse.json({ ...article, isLiked, isSaved });
}
