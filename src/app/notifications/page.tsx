"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  entityId: string | null;
  message: string | null;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    image: string | null;
  } | null;
}

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => setNotifications(data.items || data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, router]);

  const markAllRead = async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_FOLLOWER":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "ARTICLE_LIKED":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-500">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        );
      case "ARTICLE_SAVED":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-navy-700">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
        );
      case "ARTICLE_REPOSTED":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case "COMMENT_REPLY":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
        );
      case "NEW_TOPIC":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
    }
  };

  const getNotificationText = (n: Notification) => {
    const name = n.sender?.name || "Someone";
    switch (n.type) {
      case "NEW_FOLLOWER":
        return `${name} started following you`;
      case "ARTICLE_LIKED":
        return `${name} liked your article`;
      case "ARTICLE_SAVED":
        return `${name} saved your article`;
      case "ARTICLE_REPOSTED":
        return `${name} reposted your article`;
      case "COMMENT_REPLY":
        return `${name} replied to your comment`;
      case "NEW_TOPIC":
        return "A new topic has been published";
      default:
        return `${name} interacted with your content`;
    }
  };

  const getNotificationLink = (n: Notification) => {
    switch (n.type) {
      case "NEW_FOLLOWER":
        return n.sender ? `/profile/${n.sender.id}` : "#";
      case "ARTICLE_LIKED":
      case "ARTICLE_SAVED":
      case "ARTICLE_REPOSTED":
      case "COMMENT_REPLY":
        // entityId is the articleId - try to link there
        return n.entityId ? `/topic/${n.entityId}` : "#";
      case "NEW_TOPIC":
        return n.entityId ? `/topic/${n.entityId}` : "#";
      default:
        return "#";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Notifications</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse rounded-lg bg-gray-100 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="h-4 w-48 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-sm font-medium text-navy-900 hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl bg-gray-50 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          <p className="mt-4 text-gray-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={getNotificationLink(n)}
              className={`flex items-center gap-3 rounded-lg p-4 transition-colors ${
                n.read ? "hover:bg-gray-50" : "bg-navy-50 hover:bg-navy-100"
              }`}
            >
              {n.sender?.image ? (
                <Image
                  src={n.sender.image}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                  {n.sender?.name?.charAt(0) || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm ${
                    n.read ? "text-gray-600" : "font-medium text-gray-900"
                  }`}
                >
                  {getNotificationText(n)}
                </p>
                {n.message && (
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    &ldquo;{n.message}&rdquo;
                  </p>
                )}
                <p className="mt-0.5 text-xs text-gray-400">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getNotificationIcon(n.type)}
                {!n.read && (
                  <div className="h-2 w-2 rounded-full bg-navy-900" />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
