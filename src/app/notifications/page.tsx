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
      .then((data) => setNotifications(data.notifications || []))
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

  const getNotificationText = (n: Notification) => {
    const name = n.sender?.name || "Someone";
    switch (n.type) {
      case "FOLLOW":
        return `${name} started following you`;
      case "LIKE":
        return `${name} liked your article`;
      case "COMMENT":
        return `${name} commented on an article`;
      case "REPLY":
        return `${name} replied to your comment`;
      default:
        return `${name} interacted with your content`;
    }
  };

  const getNotificationLink = (n: Notification) => {
    switch (n.type) {
      case "FOLLOW":
        return n.sender ? `/profile/${n.sender.id}` : "#";
      case "LIKE":
      case "COMMENT":
      case "REPLY":
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
              <div className="flex-1">
                <p
                  className={`text-sm ${
                    n.read ? "text-gray-600" : "font-medium text-gray-900"
                  }`}
                >
                  {getNotificationText(n)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <div className="h-2 w-2 rounded-full bg-navy-900" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
