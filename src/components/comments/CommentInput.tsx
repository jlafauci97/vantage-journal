"use client";

import { useState } from "react";
import Image from "next/image";

interface CommentInputProps {
  userImage?: string | null;
  userName?: string | null;
  placeholder?: string;
  onSubmit: (content: string) => Promise<void>;
  autoFocus?: boolean;
}

export function CommentInput({
  userImage,
  userName,
  placeholder = "Write a comment...",
  onSubmit,
  autoFocus = false,
}: CommentInputProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex gap-3">
      {userImage ? (
        <Image
          src={userImage}
          alt={userName || ""}
          width={32}
          height={32}
          className="h-8 w-8 flex-shrink-0 rounded-full"
        />
      ) : (
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
          {userName?.[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={2}
          maxLength={5000}
          className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              handleSubmit();
            }
          }}
        />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {content.length > 0 && `${content.length}/5000`}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            className="rounded-lg bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
