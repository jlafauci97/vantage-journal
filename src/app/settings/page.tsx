"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageUpload } from "@/components/upload/ImageUpload";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [workplace, setWorkplace] = useState("");
  const [interests, setInterests] = useState("");
  const [viewpoints, setViewpoints] = useState("");
  const [image, setImage] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (session?.user) {
      setName(session.user.name || "");
      setImage(session.user.image || "");
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        const u = data.user;
        if (u?.bio) setBio(u.bio);
        if (u?.workplace) setWorkplace(u.workplace);
        if (u?.interests) setInterests(u.interests);
        if (u?.viewpoints) setViewpoints(u.viewpoints);
        if (u?.coverImage) setCoverImage(u.coverImage);
        if (u?.image) setImage(u.image);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/users/${session.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          bio,
          workplace,
          interests,
          viewpoints,
          image: image || undefined,
          coverImage: coverImage || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update");
      }

      await update({ name });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-gray-200" />
          <div className="h-64 rounded-xl bg-gray-100" />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 p-4 text-sm text-green-600">
            Profile updated successfully!
          </div>
        )}

        {/* Profile Picture */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Profile Picture</h2>
          <div className="flex items-start gap-6">
            <div className="shrink-0">
              {image ? (
                <Image
                  src={image}
                  alt={name}
                  width={80}
                  height={80}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-900 text-2xl font-bold text-white">
                  {name?.charAt(0) || "?"}
                </div>
              )}
            </div>
            <ImageUpload
              endpoint="profileImage"
              value={image}
              onChange={setImage}
              aspectHint="Square image recommended"
              className="flex-1"
            />
          </div>
        </div>

        {/* Cover Photo */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Cover Photo</h2>
          <ImageUpload
            endpoint="coverImage"
            value={coverImage}
            onChange={setCoverImage}
            aspectHint="Recommended: 1200 x 400px"
          />
        </div>

        {/* Basic Info */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">Basic Info</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={session.user.email || ""}
              disabled
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
          </div>
        </div>

        {/* About You */}
        <div className="rounded-xl bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">About You</h2>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="Tell others about yourself..."
            />
            <p className="mt-1 text-xs text-gray-400">{bio.length}/500</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Work / Education
            </label>
            <input
              type="text"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="Where do you work or study?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Interests
            </label>
            <textarea
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="What are you interested in?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Perspectives I Support
            </label>
            <textarea
              value={viewpoints}
              onChange={(e) => setViewpoints(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-navy-500 focus:ring-2 focus:ring-navy-500/20"
              placeholder="What viewpoints do you align with?"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
