import { getOpenAI, MODEL } from "./openai";
import { prisma } from "./prisma";
import { z } from "zod";

const GeneratedArticleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(100),
});

type GeneratedArticle = z.infer<typeof GeneratedArticleSchema>;

interface PerspectiveInfo {
  name: string;
  category: string;
  description: string | null;
}

interface TopicInfo {
  title: string;
  description: string | null;
  sourceUrl: string | null;
}

function buildSystemPrompt(perspective: PerspectiveInfo): string {
  return `You are a skilled journalist writing for Vantage Journal, a news platform that presents stories from multiple ideological and cultural perspectives.

You are writing from the ${perspective.name} perspective.
Category: ${perspective.category}
${perspective.description ? `\nPerspective context: ${perspective.description}` : ""}

Your task is to write a news article about a given topic from this specific perspective. The article should:
1. Present the facts of the story accurately
2. Frame the narrative, emphasis, and analysis through the lens of this perspective
3. Use language, tone, and rhetorical style consistent with this perspective
4. Be between 800-1200 words
5. Include a compelling headline that reflects this perspective's framing
6. Include a 2-3 sentence summary
7. Be written in a professional journalistic style

IMPORTANT: Do NOT fabricate facts. You may emphasize different aspects of the story, offer different interpretations, or focus on different implications, but all factual claims must be grounded in the provided topic description.

Respond ONLY with valid JSON in this exact format:
{
  "title": "The article headline",
  "summary": "2-3 sentence summary",
  "content": "The full article body in Markdown format"
}`;
}

function buildUserPrompt(topic: TopicInfo): string {
  let prompt = `Write an article about the following topic.

TOPIC: ${topic.title}`;

  if (topic.description) {
    prompt += `\n\nDESCRIPTION: ${topic.description}`;
  }

  if (topic.sourceUrl) {
    prompt += `\n\nSOURCE REFERENCE: ${topic.sourceUrl}`;
  }

  return prompt;
}

async function generateSingleArticle(
  topic: TopicInfo,
  perspective: PerspectiveInfo
): Promise<GeneratedArticle> {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(perspective) },
      { role: "user", content: buildUserPrompt(topic) },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 3000,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(text);
  return GeneratedArticleSchema.parse(parsed);
}

async function moderateContent(content: string): Promise<boolean> {
  try {
    const moderation = await getOpenAI().moderations.create({ input: content });
    return !moderation.results[0].flagged;
  } catch {
    return true;
  }
}

export interface GenerationResult {
  perspectiveId: string;
  perspectiveName: string;
  status: "success" | "failed" | "flagged";
  error?: string;
}

export async function generateArticlesForTopic(
  topicId: string,
  perspectiveIds: string[]
): Promise<GenerationResult[]> {
  await prisma.topic.update({
    where: { id: topicId },
    data: { status: "GENERATING" },
  });

  const topic = await prisma.topic.findUniqueOrThrow({
    where: { id: topicId },
  });

  const results: GenerationResult[] = [];

  for (const perspectiveId of perspectiveIds) {
    const perspective = await prisma.perspective.findUniqueOrThrow({
      where: { id: perspectiveId },
    });

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const generated = await generateSingleArticle(topic, perspective);
        const isSafe = await moderateContent(generated.content);

        await prisma.article.upsert({
          where: {
            topicId_perspectiveId: { topicId, perspectiveId },
          },
          create: {
            topicId,
            perspectiveId,
            title: generated.title,
            summary: generated.summary,
            content: generated.content,
            status: isSafe ? "PUBLISHED" : "DRAFT",
          },
          update: {
            title: generated.title,
            summary: generated.summary,
            content: generated.content,
            status: isSafe ? "PUBLISHED" : "DRAFT",
          },
        });

        results.push({
          perspectiveId,
          perspectiveName: perspective.name,
          status: isSafe ? "success" : "flagged",
        });
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          results.push({
            perspectiveId,
            perspectiveName: perspective.name,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
        await new Promise((r) => setTimeout(r, 1000 * attempts));
      }
    }
  }

  const anySuccess = results.some((r) => r.status === "success");
  await prisma.topic.update({
    where: { id: topicId },
    data: { status: anySuccess ? "PUBLISHED" : "DRAFT" },
  });

  return results;
}
