import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateArticlesForTopic } from "@/lib/generate-article";
import { generateArticlesSchema } from "@/lib/validators";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ topicId: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { topicId } = await params;
  const body = await req.json();
  const { perspectiveIds } = generateArticlesSchema.parse(body);

  const results = await generateArticlesForTopic(topicId, perspectiveIds);

  return NextResponse.json({ results });
}
