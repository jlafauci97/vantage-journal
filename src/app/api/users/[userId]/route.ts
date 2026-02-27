import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const session = await auth();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      coverImage: true,
      bio: true,
      workplace: true,
      interests: true,
      viewpoints: true,
      createdAt: true,
      _count: {
        select: {
          following: true,
          followers: true,
          likes: true,
          saves: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let isFollowing = false;
  if (session?.user?.id && session.user.id !== userId) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: userId,
        },
      },
    });
    isFollowing = !!follow;
  }

  // Fetch liked articles
  const likedArticles = await prisma.like.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      article: {
        include: {
          perspective: { select: { id: true, name: true, slug: true, category: true, color: true } },
          topic: { select: { id: true, title: true, slug: true } },
        },
      },
    },
  });

  // Fetch saved articles (only for own profile)
  let savedArticles: typeof likedArticles = [];
  if (session?.user?.id === userId) {
    savedArticles = await prisma.save.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        article: {
          include: {
            perspective: { select: { id: true, name: true, slug: true, category: true, color: true } },
            topic: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
  }

  return NextResponse.json({
    user: { ...user, isFollowing },
    likedArticles: likedArticles.map((l) => l.article),
    savedArticles: savedArticles.map((s) => s.article),
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  const { userId } = await params;

  if (session?.user?.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = updateProfileSchema.parse(body);

  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return NextResponse.json(user);
}
