import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTopicSchema } from "@/lib/validators";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const { topicId } = await params;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "asc" },
        include: {
          perspective: true,
          _count: { select: { likes: true, saves: true, comments: true } },
        },
      },
    },
  });

  if (!topic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(topic);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { topicId } = await params;
  const body = await req.json();
  const data = updateTopicSchema.parse(body);

  const topic = await prisma.topic.update({
    where: { id: topicId },
    data,
  });

  return NextResponse.json(topic);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { topicId } = await params;
  await prisma.topic.delete({ where: { id: topicId } });

  return NextResponse.json({ ok: true });
}
