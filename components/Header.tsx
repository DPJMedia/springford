"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { NotificationBell } from "./NotificationBell";
import { SearchDropdown } from "./SearchDropdown";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const supabase = createClient();

  const nav = [
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
          .select("is_admin, is_super_admin, full_name, avatar_url, newsletter_subscribed")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setIsAdmin(data.is_admin || data.is_super_admin);
              setNewsletterSubscribed(data.newsletter_subscribed || false);
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
          .select("is_admin, is_super_admin, full_name, avatar_url, newsletter_subscribed")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setIsAdmin(data.is_admin || data.is_super_admin);
              setNewsletterSubscribed(data.newsletter_subscribed || false);
              setUserName(data.full_name || session.user.email?.split("@")[0] || "User");
              setUserAvatar(data.avatar_url);
            }
          });
      } else {
        setIsAdmin(false);
        setNewsletterSubscribed(false);
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
    <header className="sticky top-0 z-20 bg-white">
      {/* Full two-row header sticks together (LA Times style) */}
      <div className="border-b border-[color:var(--color-border)] bg-white backdrop-blur">
        <div className="mx-auto grid w-full max-w-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:px-6 lg:px-8">
          {/* Left: Search + Notification flush left (desktop and mobile) */}
          <div className="flex min-w-0 items-center justify-start gap-2">
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  ref={searchButtonRef}
                  onClick={() => setShowSearch(!showSearch)}
                  className="p-2 rounded-full hover:bg-gray-100 transition text-[color:var(--color-dark)]"
                  aria-label="Search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <SearchDropdown isOpen={showSearch} onClose={() => setShowSearch(false)} anchorRef={searchButtonRef} />
              </div>
              {user && isAdmin && <NotificationBell />}
            </div>
          </div>

          {/* Center: Logo - dead center, fixed size (does not shrink) */}
          <Link href="/" className="flex items-center justify-center flex-shrink-0 z-10">
            <span className="masthead text-2xl sm:text-3xl font-semibold text-[color:var(--color-dark)] whitespace-nowrap" style={{ letterSpacing: "-0.02em" }}>
              Spring-Ford Press
            </span>
          </Link>

          {/* Right: full menu only at desktop (xl+); below that = hamburger */}
          <div className="flex min-w-0 items-center justify-end gap-2">
            {/* Hamburger layout: bar has only Search, Notification, Logo, Menu (no profile in bar to avoid overlap) */}
            <div className="flex xl:hidden items-center gap-2">
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="flex items-center gap-1 p-2 rounded-md hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6 text-[color:var(--color-dark)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showMobileNav ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
                <span className="text-[9px] uppercase tracking-wider text-[color:var(--color-medium)]">menu</span>
              </button>
            </div>

            {/* Desktop only (1280px+): Advertise, Support, Subscribe, User */}
            <div className="hidden xl:flex items-center gap-2 flex-shrink-0 justify-end">
              {user ? (
                <>
                  <Link href="/advertise" className="rounded-full border border-[color:var(--color-border)] bg-white px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition flex-shrink-0">
                    Advertise
                  </Link>
                  <Link href="/support" className="rounded-full border border-[color:var(--color-border)] bg-white px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition flex-shrink-0">
                    Support
                  </Link>
                  {!newsletterSubscribed && (
                    <Link href="/subscribe" className="rounded-full bg-[color:var(--color-riviera-blue)] px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition flex-shrink-0">
                      Subscribe
                    </Link>
                  )}
                  <div className="relative user-menu">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-gray-100 px-3 sm:px-4 py-2 hover:bg-gray-200 transition"
                    >
                      <span className="hidden sm:inline text-sm font-semibold text-[color:var(--color-dark)]">{userName}</span>
                      <Avatar src={userAvatar} name={userName} email={user.email} size="sm" />
                      <svg className="h-4 w-4 text-[color:var(--color-medium)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showMenu && (
                      <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {isAdmin && (
                            <Link href="/admin" onClick={() => setShowMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                              Dashboard
                            </Link>
                          )}
                          <Link href="/profile" onClick={() => setShowMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            My Profile
                          </Link>
                          <div className="border-t border-gray-100" />
                          <button onClick={() => { setShowMenu(false); handleLogout(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Log out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/advertise" className="rounded-full border border-[color:var(--color-border)] bg-white px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition flex-shrink-0">
                    Advertise
                  </Link>
                  <Link href="/support" className="rounded-full border border-[color:var(--color-border)] bg-white px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition flex-shrink-0">
                    Support
                  </Link>
                  <Link href="/subscribe" className="rounded-full bg-[color:var(--color-riviera-blue)] px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition flex-shrink-0">
                    Subscribe
                  </Link>
                  <Link href="/login" className="rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-opacity-90">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section strip: below menu bar, centered (desktop only, 1280px+) */}
      <div className="hidden xl:block border-b border-[color:var(--color-border)] bg-white">
        <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 px-4 py-3 text-[color:var(--color-dark)]">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm font-semibold transition hover:bg-gray-100 whitespace-nowrap flex-shrink-0"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </div>

      {/* Hamburger dropdown - user account at top, then sections, Advertise, Support, Subscribe (shown below 1280px) */}
      {showMobileNav && (
        <div className="xl:hidden border-t border-[color:var(--color-border)] bg-white">
          {/* User account at top of menu - same actions as desktop */}
          <div className="px-4 py-3 border-b border-[color:var(--color-border)] bg-gray-50">
            {user ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white border border-[color:var(--color-border)]">
                  <Avatar src={userAvatar} name={userName} email={user.email} size="sm" />
                  <span className="text-sm font-semibold text-[color:var(--color-dark)]">{userName}</span>
                </div>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setShowMobileNav(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100 rounded-md transition">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    Dashboard
                  </Link>
                )}
                <Link href="/profile" onClick={() => setShowMobileNav(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100 rounded-md transition">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  My Profile
                </Link>
                <button onClick={() => { setShowMobileNav(false); handleLogout(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-md transition">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Log out
                </button>
              </div>
            ) : (
              <Link href="/login" onClick={() => setShowMobileNav(false)} className="flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-3 text-sm font-semibold text-white hover:bg-opacity-90 transition">
                Log in
              </Link>
            )}
          </div>
          <nav className="px-4 py-3 space-y-1 border-b border-[color:var(--color-border)]">
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
          <div className="px-4 py-3 flex flex-wrap gap-2">
            <Link href="/advertise" onClick={() => setShowMobileNav(false)} className="rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition">
              Advertise
            </Link>
            <Link href="/support" onClick={() => setShowMobileNav(false)} className="rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-50 transition">
              Support
            </Link>
            {(!user || !newsletterSubscribed) && (
              <Link href="/subscribe" onClick={() => setShowMobileNav(false)} className="rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
                Subscribe
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
