import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reactionSchema } from "@/lib/validators";

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
  const { type } = reactionSchema.parse(body);
  const userId = session.user.id;

  const existing = await prisma.reaction.findUnique({
    where: { userId_articleId_type: { userId, articleId, type } },
  });

  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ reacted: false, type });
  }

  await prisma.reaction.create({ data: { userId, articleId, type } });
  return NextResponse.json({ reacted: true, type });
}
