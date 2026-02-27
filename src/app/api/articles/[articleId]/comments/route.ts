import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const { articleId } = await params;
  const session = await auth();

  const comments = await prisma.comment.findMany({
    where: { articleId, parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { likes: true } },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  // Check which comments/replies the user has liked
  let likedCommentIds: Set<string> = new Set();
  if (session?.user?.id) {
    const userLikes = await prisma.commentLike.findMany({
      where: {
        userId: session.user.id,
        commentId: {
          in: comments.flatMap((c) => [c.id, ...c.replies.map((r) => r.id)]),
        },
      },
      select: { commentId: true },
    });
    likedCommentIds = new Set(userLikes.map((l) => l.commentId));
  }

  const enriched = comments.map((c) => ({
    ...c,
    isLiked: likedCommentIds.has(c.id),
    replies: c.replies.map((r) => ({
      ...r,
      isLiked: likedCommentIds.has(r.id),
    })),
  }));

  return NextResponse.json(enriched);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { articleId } = await params;
  const body = await req.json();
  const content = body.content?.trim();
  const parentId = body.parentId || null;

  if (!content || content.length > 5000) {
    return NextResponse.json(
      { error: "Comment must be 1-5000 characters" },
      { status: 400 }
    );
  }

  // Verify article exists
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { id: true, authorId: true },
  });
  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // If replying, verify parent comment exists and belongs to this article
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { articleId: true, userId: true },
    });
    if (!parent || parent.articleId !== articleId) {
      return NextResponse.json(
        { error: "Parent comment not found" },
        { status: 404 }
      );
    }

    // Notify the parent comment author about the reply
    if (parent.userId !== session.user.id) {
      await prisma.notification.create({
        data: {
          receiverId: parent.userId,
          senderId: session.user.id,
          type: "COMMENT_REPLY",
          entityId: articleId,
          message: content.slice(0, 100),
        },
      });
    }
  }

  const comment = await prisma.comment.create({
    data: {
      userId: session.user.id,
      articleId,
      content,
      parentId,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, image: true } },
          _count: { select: { likes: true } },
        },
      },
      _count: { select: { likes: true } },
    },
  });

  return NextResponse.json({ ...comment, isLiked: false }, { status: 201 });
}
