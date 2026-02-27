"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { REACTION_LABELS } from "@/lib/constants";

interface ArticleActionsProps {
  articleId: string;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikeCount: number;
  initialReactions: Record<string, number>;
  userReactions: string[];
}

export function ArticleActions({
  articleId,
  initialLiked,
  initialSaved,
  initialLikeCount,
  initialReactions,
  userReactions,
}: ArticleActionsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(initialSaved);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [reactions, setReactions] = useState(initialReactions);
  const [activeReactions, setActiveReactions] = useState<Set<string>>(
    new Set(userReactions)
  );

  const requireAuth = () => {
    if (!session) {
      router.push("/login");
      return true;
    }
    return false;
  };

  const toggleLike = async () => {
    if (requireAuth()) return;
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    await fetch(`/api/articles/${articleId}/like`, { method: "POST" });
  };

  const toggleSave = async () => {
    if (requireAuth()) return;
    setSaved(!saved);
    await fetch(`/api/articles/${articleId}/save`, { method: "POST" });
  };

  const toggleReaction = async (type: string) => {
    if (requireAuth()) return;
    const isActive = activeReactions.has(type);
    const next = new Set(activeReactions);
    if (isActive) {
      next.delete(type);
      setReactions((r) => ({ ...r, [type]: (r[type] || 1) - 1 }));
    } else {
      next.add(type);
      setReactions((r) => ({ ...r, [type]: (r[type] || 0) + 1 }));
    }
    setActiveReactions(next);
    await fetch(`/api/articles/${articleId}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <div className="space-y-4">
      {/* Like, Save, Share row */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleLike}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-red-500 transition-colors"
        >
          <svg
            className={`h-5 w-5 ${liked ? "fill-red-500 text-red-500" : ""}`}
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span>{likeCount}</span>
        </button>

        <button
          onClick={toggleSave}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-navy-900 transition-colors"
        >
          <svg
            className={`h-5 w-5 ${saved ? "fill-navy-900 text-navy-900" : ""}`}
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          <span>{saved ? "Saved" : "Save"}</span>
        </button>

        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span>Share</span>
        </button>
      </div>

      {/* Reactions row */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(REACTION_LABELS).map(([type, { emoji, label }]) => (
          <button
            key={type}
            onClick={() => toggleReaction(type)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-all ${
              activeReactions.has(type)
                ? "border-navy-500 bg-navy-50 text-navy-900"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>{emoji}</span>
            <span>{reactions[type] || 0}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
