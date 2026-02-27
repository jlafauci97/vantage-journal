"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface VoteButtonsProps {
  articleId: string;
  initialScore: number;
  initialVote: number | null; // +1, -1, or null
  initialReposted: boolean;
  initialRepostCount: number;
}

export function VoteButtons({
  articleId,
  initialScore,
  initialVote,
  initialReposted,
  initialRepostCount,
}: VoteButtonsProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState(initialVote);
  const [reposted, setReposted] = useState(initialReposted);
  const [repostCount, setRepostCount] = useState(initialRepostCount);

  const requireAuth = () => {
    if (!session) {
      router.push("/login");
      return true;
    }
    return false;
  };

  const handleVote = async (value: 1 | -1) => {
    if (requireAuth()) return;

    // Optimistic update
    if (vote === value) {
      setScore((s) => s - value);
      setVote(null);
    } else if (vote === null) {
      setScore((s) => s + value);
      setVote(value);
    } else {
      setScore((s) => s + value * 2);
      setVote(value);
    }

    await fetch(`/api/articles/${articleId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  };

  const handleRepost = async () => {
    if (requireAuth()) return;

    setReposted(!reposted);
    setRepostCount((c) => (reposted ? c - 1 : c + 1));

    await fetch(`/api/articles/${articleId}/repost`, {
      method: "POST",
    });
  };

  return (
    <div className="flex items-center gap-4">
      {/* Vote buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleVote(1)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            vote === 1
              ? "bg-green-100 text-green-600"
              : "text-gray-400 hover:bg-gray-100 hover:text-green-600"
          }`}
          title="Upvote"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <span
          className={`min-w-[2rem] text-center text-sm font-semibold ${
            score > 0 ? "text-green-600" : score < 0 ? "text-red-500" : "text-gray-500"
          }`}
        >
          {score}
        </span>
        <button
          onClick={() => handleVote(-1)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
            vote === -1
              ? "bg-red-100 text-red-500"
              : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
          }`}
          title="Downvote"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Repost button */}
      <button
        onClick={handleRepost}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
          reposted
            ? "bg-navy-50 text-navy-700"
            : "text-gray-500 hover:bg-gray-100 hover:text-navy-700"
        }`}
        title="Repost"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{repostCount > 0 ? repostCount : "Repost"}</span>
      </button>
    </div>
  );
}
