import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateArticleSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { articleId } = await params;

  const article = await prisma.article.findUnique({
    where: { id: articleId },
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

  return NextResponse.json(article);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const session = await auth();
  const { articleId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { authorId: true },
  });

  if (!article || article.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = updateArticleSchema.parse(body);

  const updated = await prisma.article.update({
    where: { id: articleId },
    data: {
      ...data,
      imageUrl: data.imageUrl || null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const session = await auth();
  const { articleId } = await params;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { authorId: true },
  });

  if (!article || article.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.article.delete({ where: { id: articleId } });

  return NextResponse.json({ success: true });
}
