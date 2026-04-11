"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { Avatar } from "./Avatar";
import { normalizeAvatarUrl } from "@/lib/user/display";
import { NotificationBell } from "./NotificationBell";
import { SearchDropdown } from "./SearchDropdown";
import { trackSectionClick } from "@/lib/analytics/tracker";
import { useTenant } from "@/lib/tenant/TenantProvider";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [userUsername, setUserUsername] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showMobileUserMenu, setShowMobileUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const mobileUserMenuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const { id: tenantId, section_config: sectionConfig } = useTenant();

  const allNavItems = useMemo(() => {
    if (!Array.isArray(sectionConfig)) return [];
    return sectionConfig.map((entry) => {
      const slug = String((entry as { slug?: string }).slug || "").trim();
      const label = String((entry as { label?: string }).label || slug).trim();
      return {
        label: label || slug,
        slug: slug.toLowerCase(),
        href: slug ? `/#${encodeURIComponent(slug)}` : "/",
      };
    });
  }, [sectionConfig]);

  const [sectionsWithContent, setSectionsWithContent] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSectionsWithContent() {
      const { data } = await supabase
        .from("articles")
        .select("sections")
        .eq("status", "published")
        .eq("tenant_id", tenantId);
      const set = new Set<string>();
      (data || []).forEach((row: { sections?: string[] }) => {
        (row.sections || []).forEach((s: string) => set.add(String(s).toLowerCase().trim()));
      });
      setSectionsWithContent(set);
    }
    fetchSectionsWithContent();
  }, [supabase, tenantId]);

  const nav = allNavItems.filter((item) => sectionsWithContent.has(item.slug));

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        // Check if user is admin and get name
        supabase
          .from("user_profiles")
          .select("is_admin, is_super_admin, full_name, username, avatar_url, newsletter_subscribed")
          .eq("id", user.id)
          .single()
          .then(async ({ data: row }) => {
            if (!row) return;
            let profile = row;
            const meta = user.user_metadata || {};
            const metaU =
              typeof meta.username === "string" ? meta.username.trim() : "";
            if (metaU && !String(profile.username || "").trim()) {
              await supabase
                .from("user_profiles")
                .update({ username: metaU })
                .eq("id", user.id);
              profile = { ...profile, username: metaU };
            }
            setIsAdmin(profile.is_admin || profile.is_super_admin);
            setNewsletterSubscribed(profile.newsletter_subscribed || false);
            setUserName(profile.full_name || user.email?.split("@")[0] || "User");
            setUserUsername(profile.username || "");
            setUserAvatar(normalizeAvatarUrl(profile.avatar_url));
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
          .select("is_admin, is_super_admin, full_name, username, avatar_url, newsletter_subscribed")
          .eq("id", session.user.id)
          .single()
          .then(async ({ data: row }) => {
            if (!row) return;
            let profile = row;
            const meta = session.user.user_metadata || {};
            const metaU =
              typeof meta.username === "string" ? meta.username.trim() : "";
            if (metaU && !String(profile.username || "").trim()) {
              await supabase
                .from("user_profiles")
                .update({ username: metaU })
                .eq("id", session.user.id);
              profile = { ...profile, username: metaU };
            }
            setIsAdmin(profile.is_admin || profile.is_super_admin);
            setNewsletterSubscribed(profile.newsletter_subscribed || false);
            setUserName(profile.full_name || session.user.email?.split("@")[0] || "User");
            setUserUsername(profile.username || "");
            setUserAvatar(normalizeAvatarUrl(profile.avatar_url));
          });
      } else {
        setIsAdmin(false);
        setNewsletterSubscribed(false);
        setUserName("");
        setUserUsername("");
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

  // When user dropdown closes, always close the notifications panel so it doesn't reappear on reopen
  useEffect(() => {
    if (!showMenu) setShowNotifications(false);
  }, [showMenu]);

  // Close mobile user menu when clicking outside (mobile only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMobileUserMenu && mobileUserMenuRef.current && !mobileUserMenuRef.current.contains(target)) {
        setShowMobileUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMobileUserMenu]);

  return (
    <header className="sticky top-0 z-20 bg-[color:var(--color-off-white)] relative">
      {/* Full two-row header sticks together (LA Times style) */}
      <div className="relative z-30 border-b border-black/10 bg-[color:var(--color-off-white)] backdrop-blur">
        <div className="mx-auto grid w-full max-w-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 sm:px-6 lg:px-8">
          {/* Left: Search button (all breakpoints) */}
          <div className="flex min-w-0 items-center justify-start gap-2">
            <button
              onClick={() => { setShowMobileNav(false); setShowSearch(!showSearch); }}
              data-search-toggle="true"
              className="p-2 rounded-full hover:bg-black/10 transition text-[color:var(--color-dark)]"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Center: Logo - dead center; on mobile only, nudge up so aligned with search/hamburger buttons */}
          <Link href="/" className="flex items-center justify-center flex-shrink-0 z-10 -mt-1.5 xl:mt-0">
            <span className="masthead text-2xl sm:text-3xl font-semibold text-[color:var(--color-dark)] whitespace-nowrap leading-tight" style={{ letterSpacing: "-0.02em" }}>
              Spring-Ford Press
            </span>
          </Link>

          {/* Right: full menu only at desktop (xl+); below that = hamburger */}
          <div className="flex min-w-0 items-center justify-end gap-2">
            {/* Mobile only: hamburger (no "Menu" label), pushed right */}
            <div className="flex xl:hidden items-center ml-auto">
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="p-2 rounded-md hover:bg-black/10"
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
            </div>

            {/* Desktop only (1280px+): Advertise, Support, Subscribe, User, Search (search directly after user) */}
            <div className="hidden xl:flex items-center gap-2 flex-shrink-0 justify-end">
              {user ? (
                <>
                  <Link href="/advertise" className="inline-flex h-9 items-center rounded-full border border-black/20 px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 transition flex-shrink-0">
                    Advertise
                  </Link>
                  <Link href="/support" className="inline-flex h-9 items-center rounded-full border border-black/20 px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 transition flex-shrink-0">
                    Support
                  </Link>
                  {!newsletterSubscribed && (
                    <Link href="/subscribe" className="rounded-full bg-[color:var(--color-riviera-blue)] px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition flex-shrink-0">
                      Subscribe
                    </Link>
                  )}
                  <div className="relative user-menu flex items-center">
                    <button
                      onClick={() => setShowMenu(!showMenu)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/10 transition flex-shrink-0"
                      aria-label="Open user menu"
                    >
                      <span className="relative inline-flex flex-shrink-0">
                        <Avatar src={userAvatar} name={userName} email={user.email} size="sm" className="w-9 h-9" />
                        {isAdmin && notificationCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 inline-flex h-3 w-3 rounded-full bg-red-600 border-2 border-white" aria-label={`${notificationCount} notifications`} />
                        )}
                      </span>
                    </button>
                    {showMenu && (
                      <>
                        {isAdmin && showNotifications && (
                          <div className="absolute top-full mt-2 right-[calc(14rem+0.5rem)] w-96 max-h-[500px] z-[54] rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 bg-white overflow-hidden flex flex-col">
                            <NotificationBell
                              embedded
                              isOpen={showNotifications}
                              onClose={() => setShowNotifications(false)}
                              onUnreadCountChange={setNotificationCount}
                            />
                          </div>
                        )}
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-[55] overflow-hidden">
                          <div className="relative">
                            <div className="px-4 py-3 border-b border-gray-100">
                              <div className="text-sm font-semibold text-[color:var(--color-dark)] truncate">
                                {userName}
                              </div>
                              {userUsername && (
                                <div className="text-xs text-[color:var(--color-medium)] truncate">
                                  @{userUsername}
                                </div>
                              )}
                            </div>
                            <div className="py-1">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="flex w-full items-center gap-2 px-4 py-3 text-sm text-[color:var(--color-dark)] hover:bg-gray-100 text-left cursor-pointer min-h-[3rem]"
                                aria-label={notificationCount > 0 ? `${notificationCount} notifications` : "Notifications"}
                              >
                                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                Notifications{notificationCount > 0 ? ` (${notificationCount})` : ""}
                              </button>
                            )}
                            {isAdmin && <div className="border-t border-gray-100" />}
                            {isAdmin && (
                              <Link href="/admin/articles" onClick={() => setShowMenu(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100">
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
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link href="/advertise" className="inline-flex h-9 items-center rounded-full border border-black/20 px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 transition flex-shrink-0">
                    Advertise
                  </Link>
                  <Link href="/support" className="inline-flex h-9 items-center rounded-full border border-black/20 px-3 sm:px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 transition flex-shrink-0">
                    Support
                  </Link>
                  <Link href="/subscribe" className="rounded-full bg-[color:var(--color-riviera-blue)] px-3 sm:px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition flex-shrink-0">
                    Subscribe
                  </Link>
                  <Link href="/login" className="rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section strip: below top row; lower z-index so user/search popovers from the row above stay on top */}
      <div
        className="relative z-10 hidden xl:block border-b border-black/10 bg-white/80 backdrop-blur"
        style={{ backgroundColor: "rgba(250,250,250,0.85)" }}
      >
        <div className="flex items-center justify-center px-4 py-3">
          <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => trackSectionClick({ sectionName: item.slug, clickedFromPage: window.location.pathname, userId: user?.id })}
                className="rounded-md px-3 py-1.5 text-sm font-semibold transition hover:bg-black/10 text-[color:var(--color-dark)] whitespace-nowrap flex-shrink-0"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Inline search bar — drops below section strip (desktop) or below menu bar (mobile) */}
      <SearchDropdown isOpen={showSearch} onClose={() => setShowSearch(false)} />

      {/* Hamburger dropdown - user account at top, then sections, Advertise, Support, Subscribe (shown below 1280px) */}
      {showMobileNav && (
        <div className="xl:hidden border-t border-black/10 bg-[color:var(--color-off-white)]">
          {/* When not logged in, show Log in at top only */}
          {!user && (
            <div className="px-4 py-3 border-b border-black/10">
              <Link href="/login" onClick={() => setShowMobileNav(false)} className="flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 transition">
                Log in
              </Link>
            </div>
          )}
          <nav className="px-4 py-3 space-y-1 border-b border-black/10">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={() => { setShowMobileNav(false); trackSectionClick({ sectionName: item.slug, clickedFromPage: window.location.pathname, userId: user?.id }); }}
                className="block px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 rounded-md transition"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {/* Bottom row: Advertise, Support, Subscribe, and (when logged in) user pfp that opens Dashboard / My Profile / Log out */}
          <div className="px-4 py-3 flex flex-wrap items-center gap-2">
            <Link href="/advertise" onClick={() => setShowMobileNav(false)} className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 transition">
              Advertise
            </Link>
            <Link href="/support" onClick={() => setShowMobileNav(false)} className="rounded-full border border-black/20 px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-black/10 transition">
              Support
            </Link>
            {(!user || !newsletterSubscribed) && (
              <Link href="/subscribe" onClick={() => setShowMobileNav(false)} className="rounded-full bg-[color:var(--color-riviera-blue)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
                Subscribe
              </Link>
            )}
            {user && (
              <div className="relative ml-auto" ref={mobileUserMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowMobileUserMenu(!showMobileUserMenu)}
                  className="rounded-full p-1 hover:bg-black/10 transition flex-shrink-0"
                  aria-label="Account menu"
                >
                  <span className="relative inline-flex flex-shrink-0">
                    <Avatar src={userAvatar} name={userName} email={user.email} size="sm" />
                    {isAdmin && notificationCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 inline-flex h-3.5 w-3.5 rounded-full bg-red-600 border-2 border-white" aria-label={`${notificationCount} notifications`} />
                    )}
                  </span>
                </button>
                {showMobileUserMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-[55] overflow-hidden">
                    <div className="py-1">
                      {isAdmin && (
                        <Link href="/admin/articles" onClick={() => { setShowMobileNav(false); setShowMobileUserMenu(false); }} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          Dashboard
                        </Link>
                      )}
                      <Link href="/profile" onClick={() => { setShowMobileNav(false); setShowMobileUserMenu(false); }} className="flex items-center gap-2 px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        My Profile
                      </Link>
                      <div className="border-t border-gray-100" />
                      <button onClick={() => { setShowMobileNav(false); setShowMobileUserMenu(false); handleLogout(); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
