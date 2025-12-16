"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const supabase = createClient();

  const nav = [
    { label: "Top Stories", href: "/#top-stories" },
    { label: "Latest", href: "/#latest" },
    { label: "Politics", href: "/#politics" },
    { label: "Business", href: "/#business" },
    { label: "Local", href: "/#local" },
    { label: "Sports", href: "/#sports" },
    { label: "World", href: "/#world" },
    { label: "Technology", href: "/#technology" },
    { label: "Entertainment", href: "/#entertainment" },
    { label: "Opinion", href: "/#opinion" },
  ];

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Check if user is admin and get name
        supabase
          .from("user_profiles")
          .select("is_admin, is_super_admin, full_name")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setIsAdmin(data.is_admin || data.is_super_admin);
              setUserName(data.full_name || user.email?.split("@")[0] || "User");
            }
          });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase
          .from("user_profiles")
          .select("is_admin, is_super_admin, full_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setIsAdmin(data.is_admin || data.is_super_admin);
              setUserName(data.full_name || session.user.email?.split("@")[0] || "User");
            }
          });
      } else {
        setIsAdmin(false);
        setUserName("");
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMenu && !target.closest('.user-menu')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--color-border)] bg-white backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex flex-col leading-tight">
            <span className="masthead text-lg font-black text-[color:var(--color-dark)]">
              Spring-Ford Press
            </span>
            <span className="text-[9px] text-[color:var(--color-medium)] uppercase tracking-wider">
              Neighborhood-first
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-semibold text-[color:var(--color-dark)] md:flex">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-md px-2.5 py-1 text-xs transition hover:bg-gray-100"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative user-menu">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 hover:bg-gray-200 transition"
              >
                <div className="h-6 w-6 rounded-full bg-[color:var(--color-riviera-blue)] flex items-center justify-center text-white text-xs font-bold">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-[color:var(--color-dark)]">
                  Welcome, {userName}
                </span>
                <svg className="h-4 w-4 text-[color:var(--color-medium)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setShowMenu(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Dashboard
                      </Link>
                    )}
                    <Link
                      href="/profile"
                      onClick={() => setShowMenu(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      My Profile
                    </Link>
                    <div className="border-t border-gray-100"></div>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-[color:var(--color-riviera-blue)] px-3 py-1 text-xs font-semibold text-white transition hover:bg-opacity-90"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

