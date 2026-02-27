"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { ArticleCard } from "@/components/feed/ArticleCard";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  createdAt: string;
  _count: {
    followers: number;
    following: number;
    likes: number;
  };
  isFollowing: boolean;
}

interface Perspective {
  id: string;
  name: string;
  slug: string;
  category: string;
  color: string;
}

interface Article {
  id: string;
  title: string;
  summary: string;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  perspective: Perspective;
  topic: {
    id: string;
    title: string;
    slug: string;
  };
}

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { data: session } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likedArticles, setLikedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = session?.user?.id === userId;

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setProfile(data.user);
        setLikedArticles(data.likedArticles || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [userId]);

  const handleFollow = async () => {
    if (!session || !profile) return;
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: data.following,
                _count: {
                  ...prev._count,
                  followers: prev._count.followers + (data.following ? 1 : -1),
                },
              }
            : null
        );
      }
    } catch {
      // ignore
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse">
          <div className="h-48 rounded-xl bg-gray-200" />
          <div className="mx-auto -mt-12 h-24 w-24 rounded-full bg-gray-300" />
          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="h-4 w-60 rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">User not found</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Cover Image */}
      <div className="relative h-48 overflow-hidden rounded-xl bg-gradient-to-r from-navy-900 to-navy-700">
        {profile.coverImage && (
          <Image
            src={profile.coverImage}
            alt=""
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Profile Info */}
      <div className="relative -mt-12 text-center">
        <div className="inline-block">
          {profile.image ? (
            <Image
              src={profile.image}
              alt={profile.name || "User"}
              width={96}
              height={96}
              className="rounded-full border-4 border-white"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-navy-900 text-3xl font-bold text-white">
              {profile.name?.charAt(0) || "?"}
            </div>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {profile.name}
        </h1>

        {profile.bio && (
          <p className="mx-auto mt-2 max-w-md text-gray-600">{profile.bio}</p>
        )}

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div>
            <span className="font-semibold text-gray-900">
              {profile._count.followers}
            </span>{" "}
            <span className="text-gray-500">followers</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900">
              {profile._count.following}
            </span>{" "}
            <span className="text-gray-500">following</span>
          </div>
          <div>
            <span className="font-semibold text-gray-900">
              {profile._count.likes}
            </span>{" "}
            <span className="text-gray-500">likes</span>
          </div>
        </div>

        <div className="mt-1 text-xs text-gray-400">
          Joined {formatDate(profile.createdAt)}
        </div>

        {session && !isOwnProfile && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`mt-4 rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
              profile.isFollowing
                ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                : "bg-navy-900 text-white hover:bg-navy-800"
            }`}
          >
            {profile.isFollowing ? "Following" : "Follow"}
          </button>
        )}

        {isOwnProfile && (
          <a
            href="/settings"
            className="mt-4 inline-block rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit Profile
          </a>
        )}
      </div>

      {/* Liked Articles */}
      <div className="mt-12">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Liked Articles
        </h2>
        {likedArticles.length === 0 ? (
          <p className="text-sm text-gray-500">No liked articles yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {likedArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
