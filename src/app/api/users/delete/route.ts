import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Cascade delete everything related to the user
  await prisma.$transaction([
    prisma.commentLike.deleteMany({ where: { userId } }),
    prisma.comment.deleteMany({ where: { userId } }),
    prisma.like.deleteMany({ where: { userId } }),
    prisma.vote.deleteMany({ where: { userId } }),
    prisma.repost.deleteMany({ where: { userId } }),
    prisma.save.deleteMany({ where: { userId } }),
    prisma.reaction.deleteMany({ where: { userId } }),
    prisma.notification.deleteMany({
      where: { OR: [{ receiverId: userId }, { senderId: userId }] },
    }),
    prisma.follow.deleteMany({
      where: { OR: [{ followerId: userId }, { followingId: userId }] },
    }),
    prisma.article.deleteMany({ where: { authorId: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ deleted: true });
}
