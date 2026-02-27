"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { ArticleCard } from "@/components/feed/ArticleCard";
import { formatDate } from "@/lib/utils";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  coverImage: string | null;
  bio: string | null;
  workplace: string | null;
  interests: string | null;
  viewpoints: string | null;
  createdAt: string;
  _count: {
    followers: number;
    following: number;
    likes: number;
    saves: number;
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

type Tab = "liked" | "saved";

export default function ProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { data: session } = useSession();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [likedArticles, setLikedArticles] = useState<Article[]>([]);
  const [savedArticles, setSavedArticles] = useState<Article[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("liked");
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
        setSavedArticles(data.savedArticles || []);
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
          <div className="h-52 rounded-xl bg-gray-200" />
          <div className="-mt-14 ml-6 h-28 w-28 rounded-full bg-gray-300 border-4 border-white" />
          <div className="mt-4 ml-6 space-y-2">
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
        <p className="mt-2 text-gray-500">This profile doesn&apos;t exist.</p>
      </div>
    );
  }

  const infoFields = [
    { label: "About", value: profile.bio, icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
    { label: "Work / Education", value: profile.workplace, icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { label: "Interests", value: profile.interests, icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { label: "Perspectives I Support", value: profile.viewpoints, icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
  ];

  const visibleInfo = infoFields.filter((f) => f.value);
  const currentArticles = activeTab === "liked" ? likedArticles : savedArticles;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Cover Image */}
      <div className="relative h-52 overflow-hidden rounded-xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-600">
        {profile.coverImage && (
          <Image
            src={profile.coverImage}
            alt=""
            fill
            className="object-cover"
          />
        )}
      </div>

      {/* Profile Header */}
      <div className="relative -mt-14 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:gap-5">
          <div className="shrink-0">
            {profile.image ? (
              <Image
                src={profile.image}
                alt={profile.name || "User"}
                width={112}
                height={112}
                className="rounded-full border-4 border-white shadow-md"
              />
            ) : (
              <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-navy-900 text-3xl font-bold text-white shadow-md">
                {profile.name?.charAt(0) || "?"}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
              <p className="text-sm text-gray-500">Joined {formatDate(profile.createdAt)}</p>
            </div>
            <div className="mt-3 sm:mt-0">
              {session && !isOwnProfile && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-lg px-6 py-2 text-sm font-semibold transition-colors ${
                    profile.isFollowing
                      ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                      : "bg-navy-900 text-white hover:bg-navy-800"
                  }`}
                >
                  {profile.isFollowing ? "Following" : "Follow"}
                </button>
              )}
              {isOwnProfile && (
                <Link
                  href="/settings"
                  className="inline-block rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-6 flex items-center gap-6 border-b border-gray-200 pb-6 text-sm">
          <div className="text-center">
            <p className="font-semibold text-gray-900">{profile._count.followers}</p>
            <p className="text-gray-500">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{profile._count.following}</p>
            <p className="text-gray-500">Following</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{profile._count.likes}</p>
            <p className="text-gray-500">Likes</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-gray-900">{profile._count.saves}</p>
            <p className="text-gray-500">Saved</p>
          </div>
        </div>
      </div>

      {/* Info Fields */}
      {visibleInfo.length > 0 && (
        <div className="mt-6 rounded-xl bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">About</h3>
          <div className="space-y-3">
            {visibleInfo.map((field) => (
              <div key={field.label} className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={field.icon} />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-400">{field.label}</p>
                  <p className="text-sm text-gray-700">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-8">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("liked")}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "liked"
                ? "border-b-2 border-navy-900 text-navy-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Liked Articles ({likedArticles.length})
          </button>
          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("saved")}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "saved"
                  ? "border-b-2 border-navy-900 text-navy-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Saved Articles ({savedArticles.length})
            </button>
          )}
        </div>

        <div className="mt-4">
          {currentArticles.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No {activeTab} articles yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {currentArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
