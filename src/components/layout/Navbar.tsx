"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { NotificationBadge } from "./NotificationBadge";

export function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-navy-900 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">
              Vantage<span className="text-navy-300">Journal</span>
            </span>
          </Link>

          {/* Search - desktop */}
          <form onSubmit={handleSearch} className="mx-8 hidden flex-1 md:block">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-navy-800 px-4 py-2 text-sm text-white placeholder-navy-400 outline-none focus:ring-2 focus:ring-navy-500"
              />
              <svg
                className="absolute right-3 top-2.5 h-4 w-4 text-navy-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>

          {/* Nav links - desktop */}
          <div className="hidden items-center gap-6 md:flex">
            <Link
              href="/trending"
              className="text-sm font-medium text-navy-200 hover:text-white transition-colors"
            >
              Trending
            </Link>
            <Link
              href="/perspectives"
              className="text-sm font-medium text-navy-200 hover:text-white transition-colors"
            >
              Perspectives
            </Link>

            {session?.user && (
              <>
                <Link
                  href="/write"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-100 transition-colors"
                >
                  Write
                </Link>
                <NotificationBadge />
              </>
            )}

            {session?.user ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-600 text-sm font-bold">
                      {session.user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg bg-white py-1 shadow-xl">
                      <Link
                        href={`/profile/${session.user.id}`}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Profile
                      </Link>
                      <Link
                        href="/saved"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Saved Articles
                      </Link>
                      <Link
                        href="/notifications"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Notifications
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      {session.user.role === "ADMIN" && (
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          onClick={() => setMenuOpen(false)}
                        >
                          Admin Dashboard
                        </Link>
                      )}
                      <hr className="my-1" />
                      <button
                        onClick={() => signOut()}
                        className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-100 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-navy-800 py-4 md:hidden">
            <form onSubmit={handleSearch} className="mb-4">
              <input
                type="text"
                placeholder="Search topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-navy-800 px-4 py-2 text-sm text-white placeholder-navy-400 outline-none"
              />
            </form>
            <Link
              href="/trending"
              className="block py-2 text-navy-200 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Trending
            </Link>
            <Link
              href="/perspectives"
              className="block py-2 text-navy-200 hover:text-white"
              onClick={() => setMenuOpen(false)}
            >
              Perspectives
            </Link>
            {session?.user ? (
              <>
                <Link
                  href="/write"
                  className="block py-2 font-semibold text-white hover:text-navy-200"
                  onClick={() => setMenuOpen(false)}
                >
                  Write
                </Link>
                <Link
                  href={`/profile/${session.user.id}`}
                  className="block py-2 text-navy-200 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </Link>
                <Link
                  href="/saved"
                  className="block py-2 text-navy-200 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Saved
                </Link>
                <Link
                  href="/notifications"
                  className="block py-2 text-navy-200 hover:text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  Notifications
                </Link>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="block py-2 text-navy-200 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="mt-2 block w-full text-left py-2 text-red-400 hover:text-red-300"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="mt-2 block rounded-lg bg-white px-4 py-2 text-center text-sm font-semibold text-navy-900"
                onClick={() => setMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
