"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CommentInput } from "./CommentInput";
import { CommentItem, type CommentData } from "./CommentItem";

interface CommentSectionProps {
  articleId: string;
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/articles/${articleId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePost = async (content: string) => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/articles/${articleId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      const newComment = await res.json();
      setComments((prev) => [newComment, ...prev]);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    if (!session?.user) {
      router.push("/login");
      return;
    }

    const res = await fetch(`/api/articles/${articleId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });

    if (res.ok) {
      const newReply = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, newReply] }
            : c
        )
      );
    }
  };

  const handleDelete = async (commentId: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      // Remove from top-level or from replies
      setComments((prev) =>
        prev
          .filter((c) => c.id !== commentId)
          .map((c) => ({
            ...c,
            replies: c.replies.filter((r) => r.id !== commentId),
          }))
      );
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    const res = await fetch(`/api/comments/${commentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, content }
            : {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === commentId ? { ...r, content } : r
                ),
              }
        )
      );
    }
  };

  const handleLike = async (commentId: string) => {
    if (!session?.user) {
      router.push("/login");
      return;
    }
    await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900">
        Comments ({comments.length})
      </h3>

      {session?.user ? (
        <CommentInput
          userImage={session.user.image}
          userName={session.user.name}
          onSubmit={handlePost}
        />
      ) : (
        <p className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
          <a href="/login" className="font-medium text-navy-600 hover:underline">
            Sign in
          </a>{" "}
          to join the discussion.
        </p>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-8 w-8 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-gray-200" />
                <div className="h-12 rounded bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={session?.user?.id}
              currentUserImage={session?.user?.image}
              currentUserName={session?.user?.name}
              articleId={articleId}
              onReply={handleReply}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onLike={handleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}
