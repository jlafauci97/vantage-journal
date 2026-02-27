import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createArticleSchema } from "@/lib/validators";
import { uniqueSlug } from "@/lib/utils";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const data = createArticleSchema.parse(body);

  const article = await prisma.article.create({
    data: {
      slug: uniqueSlug(data.title),
      title: data.title,
      summary: data.summary,
      content: data.content,
      contentType: "HTML",
      isAiGenerated: false,
      imageUrl: data.imageUrl || null,
      perspectiveId: data.perspectiveId || null,
      authorId: session.user.id,
      status: data.status,
    },
  });

  return NextResponse.json(article, { status: 201 });
}
