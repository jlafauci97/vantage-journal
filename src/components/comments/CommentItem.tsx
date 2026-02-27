"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";
import { CommentInput } from "./CommentInput";

interface CommentUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Reply {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  user: CommentUser;
  isLiked: boolean;
  _count: { likes: number };
}

export interface CommentData {
  id: string;
  content: string;
  likeCount: number;
  createdAt: string;
  user: CommentUser;
  isLiked: boolean;
  replies: Reply[];
  _count: { likes: number };
}

interface CommentItemProps {
  comment: CommentData;
  currentUserId?: string;
  currentUserImage?: string | null;
  currentUserName?: string | null;
  articleId: string;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  currentUserImage,
  currentUserName,
  articleId,
  onReply,
  onDelete,
  onEdit,
  onLike,
  isReply = false,
}: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [liked, setLiked] = useState(comment.isLiked);
  const [likeCount, setLikeCount] = useState(comment.likeCount);

  const isOwner = currentUserId === comment.user.id;

  const handleLike = async () => {
    setLiked(!liked);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
    await onLike(comment.id);
  };

  const handleEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    await onEdit(comment.id, trimmed);
    setEditing(false);
  };

  const handleReplySubmit = async (content: string) => {
    await onReply(comment.id, content);
    setShowReplyInput(false);
  };

  return (
    <div className={isReply ? "ml-10 mt-3" : ""}>
      <div className="flex gap-3">
        <Link href={`/profile/${comment.user.id}`} className="flex-shrink-0">
          {comment.user.image ? (
            <Image
              src={comment.user.image}
              alt={comment.user.name || ""}
              width={isReply ? 28 : 32}
              height={isReply ? 28 : 32}
              className="rounded-full"
            />
          ) : (
            <div
              className={`flex items-center justify-center rounded-full bg-navy-900 font-bold text-white ${
                isReply ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs"
              }`}
            >
              {comment.user.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="flex items-center gap-2">
              <Link
                href={`/profile/${comment.user.id}`}
                className="text-sm font-semibold text-gray-900 hover:text-navy-600"
              >
                {comment.user.name}
              </Link>
              <span className="text-xs text-gray-400">
                {formatRelativeTime(comment.createdAt)}
              </span>
            </div>

            {editing ? (
              <div className="mt-1">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full resize-none rounded border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:border-navy-500 focus:outline-none"
                  rows={2}
                  maxLength={5000}
                />
                <div className="mt-1 flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="text-xs font-medium text-navy-600 hover:underline"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="text-xs font-medium text-gray-400 hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            )}
          </div>

          {/* Action bar */}
          <div className="mt-1 flex items-center gap-3 px-1">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                liked ? "text-red-500" : "text-gray-400 hover:text-red-500"
              }`}
            >
              <svg
                className="h-3.5 w-3.5"
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
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {!isReply && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                Reply
              </button>
            )}

            {isOwner && !editing && (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(comment.id)}
                  className="text-xs font-medium text-gray-400 hover:text-red-500"
                >
                  Delete
                </button>
              </>
            )}
          </div>

          {/* Replies */}
          {!isReply && comment.replies?.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={{
                    ...reply,
                    replies: [],
                  }}
                  currentUserId={currentUserId}
                  currentUserImage={currentUserImage}
                  currentUserName={currentUserName}
                  articleId={articleId}
                  onReply={onReply}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onLike={onLike}
                  isReply
                />
              ))}
            </div>
          )}

          {/* Reply input */}
          {showReplyInput && currentUserId && (
            <div className="mt-2 ml-10">
              <CommentInput
                userImage={currentUserImage}
                userName={currentUserName}
                placeholder={`Reply to ${comment.user.name}...`}
                onSubmit={handleReplySubmit}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
