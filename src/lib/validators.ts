import { z } from "zod";

export const createTopicSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateTopicSchema = createTopicSchema.partial();

export const generateArticlesSchema = z.object({
  perspectiveIds: z.array(z.string()).min(1),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  image: z.string().url().optional().or(z.literal("")),
  coverImage: z.string().url().optional().or(z.literal("")),
  workplace: z.string().max(200).optional(),
  interests: z.string().max(500).optional(),
  viewpoints: z.string().max(500).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().optional(),
});

export const reactionSchema = z.object({
  type: z.enum([
    "AGREE",
    "DISAGREE",
    "INTERESTING",
    "SURPRISED",
    "ANGRY",
    "LOVE",
  ]),
});

export const createArticleSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(300),
  content: z.string().min(1),
  perspectiveId: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export const updateArticleSchema = createArticleSchema.partial();
