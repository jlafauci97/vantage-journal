import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get users the current user follows
  const following = await prisma.follow.findMany({
    where: { followerId: session.user.id },
    select: { followingId: true },
  });
  const followingIds = new Set(following.map((f) => f.followingId));
  followingIds.add(session.user.id); // exclude self

  // Find users followed by people I follow (mutual connections)
  const suggestedFromMutuals = await prisma.follow.findMany({
    where: {
      followerId: { in: [...followingIds].filter((id) => id !== session.user.id) },
      followingId: { notIn: [...followingIds] },
    },
    select: {
      followingId: true,
      following: {
        select: { id: true, name: true, image: true, bio: true },
      },
    },
    take: 20,
  });

  // Dedupe and count mutual connections
  const mutualMap = new Map<string, { user: typeof suggestedFromMutuals[0]["following"]; count: number }>();
  for (const s of suggestedFromMutuals) {
    const existing = mutualMap.get(s.followingId);
    if (existing) {
      existing.count++;
    } else {
      mutualMap.set(s.followingId, { user: s.following, count: 1 });
    }
  }

  // Sort by mutual count, take top 5
  let suggestions = [...mutualMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((s) => ({ ...s.user, mutualFollowers: s.count }));

  // If not enough suggestions from mutuals, fill with active users
  if (suggestions.length < 5) {
    const existingIds = new Set([...followingIds, ...suggestions.map((s) => s.id)]);
    const activeUsers = await prisma.user.findMany({
      where: {
        id: { notIn: [...existingIds] },
        articles: { some: { status: "PUBLISHED" } },
      },
      orderBy: { createdAt: "desc" },
      take: 5 - suggestions.length,
      select: { id: true, name: true, image: true, bio: true },
    });
    suggestions = [
      ...suggestions,
      ...activeUsers.map((u) => ({ ...u, mutualFollowers: 0 })),
    ];
  }

  return NextResponse.json(suggestions);
}
