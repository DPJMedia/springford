"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const supabase = createClient();

  const nav = [
    { label: "Top Stories", href: "/#top-stories" },
    { label: "Latest", href: "/#latest" },
    { label: "Spring City", href: "/#spring-city" },
    { label: "Royersford", href: "/#royersford" },
    { label: "Limerick", href: "/#limerick" },
    { label: "Upper Providence", href: "/#upper-providence" },
    { label: "School District", href: "/#school-district" },
    { label: "Politics", href: "/#politics" },
    { label: "Business", href: "/#business" },
    { label: "Events", href: "/#events" },
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
          .select("is_admin, is_super_admin, full_name, avatar_url")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setIsAdmin(data.is_admin || data.is_super_admin);
              setUserName(data.full_name || user.email?.split("@")[0] || "User");
              setUserAvatar(data.avatar_url);
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
          .select("is_admin, is_super_admin, full_name, avatar_url")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setIsAdmin(data.is_admin || data.is_super_admin);
              setUserName(data.full_name || session.user.email?.split("@")[0] || "User");
              setUserAvatar(data.avatar_url);
            }
          });
      } else {
        setIsAdmin(false);
        setUserName("");
        setUserAvatar(null);
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
      {/* Main Header */}
      <div className="mx-auto flex w-full max-w-none items-center justify-between gap-2 px-3 py-1.5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col leading-tight">
            <span className="masthead text-base sm:text-lg font-black text-[color:var(--color-dark)] whitespace-nowrap">
              Spring-Ford Press
            </span>
            <span className="text-[8px] sm:text-[9px] text-[color:var(--color-medium)] uppercase tracking-wider whitespace-nowrap">
              Neighborhood-first
            </span>
          </div>
        </Link>

        {/* Desktop Navigation - Hidden on mobile/tablet */}
        <nav className="hidden xl:flex items-center gap-0.5 text-sm font-semibold text-[color:var(--color-dark)] flex-1 justify-center">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-md px-2 py-1 text-[11px] transition hover:bg-gray-100 whitespace-nowrap"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Side - User Menu & Mobile Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Hamburger Menu Button - Visible on mobile/tablet */}
          <button
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="xl:hidden p-2 rounded-md hover:bg-gray-100"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 text-[color:var(--color-dark)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {showMobileNav ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {user ? (
            <>
              {isAdmin && <NotificationBell />}
              <div className="relative user-menu">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-1 sm:gap-2 rounded-full bg-gray-100 px-2 sm:px-3 py-1.5 hover:bg-gray-200 transition"
                >
                  <Avatar src={userAvatar} name={userName} email={user.email} size="sm" />
                  <span className="hidden sm:inline text-sm font-semibold text-[color:var(--color-dark)]">
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
            </>
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

      {/* Mobile Navigation Dropdown */}
      {showMobileNav && (
        <div className="xl:hidden border-t border-[color:var(--color-border)] bg-white">
          <nav className="px-4 py-3 space-y-1">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => setShowMobileNav(false)}
                className="block px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-100 rounded-md transition"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

