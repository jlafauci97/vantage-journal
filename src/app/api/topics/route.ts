import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTopicSchema } from "@/lib/validators";
import slugify from "slugify";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");

  const topics = await prisma.topic.findMany({
    where: status ? { status: status as "DRAFT" | "PUBLISHED" | "GENERATING" | "ARCHIVED" } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      articles: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          perspective: { select: { name: true, slug: true, color: true } },
        },
      },
      _count: { select: { articles: true } },
    },
  });

  return NextResponse.json(topics);
}

export async function POST(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const data = createTopicSchema.parse(body);

  const slug = slugify(data.title, { lower: true, strict: true });

  const topic = await prisma.topic.create({
    data: {
      title: data.title,
      slug,
      description: data.description,
      sourceUrl: data.sourceUrl || null,
      imageUrl: data.imageUrl || null,
    },
  });

  return NextResponse.json(topic, { status: 201 });
}
