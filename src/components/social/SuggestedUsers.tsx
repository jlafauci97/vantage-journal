"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

interface SuggestedUser {
  id: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  mutualFollowers: number;
}

export function SuggestedUsers() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) {
      setLoading(false);
      return;
    }

    fetch("/api/users/suggestions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setUsers(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session]);

  const handleFollow = async (userId: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });

    await fetch(`/api/users/${userId}/follow`, { method: "POST" });
  };

  if (!session?.user || loading) return null;
  if (users.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-bold text-gray-900 uppercase tracking-wide">
        Suggested for you
      </h3>
      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.id} className="flex items-center gap-3">
            <Link href={`/profile/${user.id}`} className="flex-shrink-0">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name || ""}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">
                  {user.name?.[0]?.toUpperCase() || "?"}
                </div>
              )}
            </Link>
            <div className="flex-1 min-w-0">
              <Link
                href={`/profile/${user.id}`}
                className="text-sm font-semibold text-gray-900 hover:text-navy-600 block truncate"
              >
                {user.name}
              </Link>
              {user.mutualFollowers > 0 ? (
                <p className="text-xs text-gray-400">
                  {user.mutualFollowers} mutual{user.mutualFollowers > 1 ? "s" : ""}
                </p>
              ) : user.bio ? (
                <p className="text-xs text-gray-400 truncate">{user.bio}</p>
              ) : null}
            </div>
            <button
              onClick={() => handleFollow(user.id)}
              className={`flex-shrink-0 rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                followed.has(user.id)
                  ? "bg-gray-100 text-gray-500"
                  : "bg-navy-900 text-white hover:bg-navy-800"
              }`}
            >
              {followed.has(user.id) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
