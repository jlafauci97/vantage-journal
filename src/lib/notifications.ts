import { prisma } from "@/lib/prisma";

type NotificationType =
  | "NEW_FOLLOWER"
  | "ARTICLE_LIKED"
  | "ARTICLE_SAVED"
  | "ARTICLE_REPOSTED"
  | "NEW_TOPIC"
  | "COMMENT_REPLY";

interface CreateNotificationInput {
  receiverId: string;
  senderId: string;
  type: NotificationType;
  entityId?: string;
  message?: string;
}

/**
 * Create a notification with deduplication.
 * Won't create duplicate notifications for the same sender+receiver+type+entity
 * within the last hour, and won't notify the user about their own actions.
 */
export async function createNotification({
  receiverId,
  senderId,
  type,
  entityId,
  message,
}: CreateNotificationInput) {
  // Don't notify yourself
  if (receiverId === senderId) return;

  // Deduplicate: check if same notification exists within the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({
    where: {
      receiverId,
      senderId,
      type,
      entityId: entityId || null,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (existing) return;

  await prisma.notification.create({
    data: {
      receiverId,
      senderId,
      type,
      entityId,
      message,
    },
  });
}
