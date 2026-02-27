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
  const userId = session.user.id;

  const existing = await prisma.save.findUnique({
    where: { userId_articleId: { userId, articleId } },
  });

  if (existing) {
    await prisma.save.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.save.create({ data: { userId, articleId } });
  return NextResponse.json({ saved: true });
}
