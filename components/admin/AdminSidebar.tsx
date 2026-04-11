"use client";

import Link from "next/link";
import { useState, type ReactElement } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/tenant/TenantProvider";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  exact?: boolean;
  superAdminOnly?: boolean;
  highlight?: boolean;
}

interface AdminSidebarProps {
  profile: any;
}

function formatRoleLabel(profile: any): string {
  if (profile?.is_super_admin) return "SUPER ADMIN";
  if (profile?.is_admin) return "ADMIN";
  return "USER";
}

export function AdminSidebar({ profile }: AdminSidebarProps) {
  const { name: siteName } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const navItems: NavItem[] = [
    { icon: "dashboard", label: "Dashboard", href: "/admin/diffuse", highlight: true },
    { icon: "article", label: "Articles", href: "/admin/articles" },
    { icon: "analytics", label: "Analytics", href: "/admin/analytics" },
    { icon: "newsletter", label: "Newsletter", href: "/admin/newsletter" },
    { icon: "dollar", label: "Ad Quoter", href: "/admin/ad-quoter" },
    { icon: "megaphone", label: "Ad Manager", href: "/admin/ads", superAdminOnly: true },
    { icon: "users", label: "Users", href: "/admin/users", superAdminOnly: true },
    { icon: "building", label: "Tenants", href: "/admin/tenants", superAdminOnly: true },
  ];

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, ReactElement> = {
      dashboard: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      article: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      analytics: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      newsletter: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      email: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      dollar: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      megaphone: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      users: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      building: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      diffuse: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      user: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    };
    return icons[iconName] || icons.dashboard;
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.superAdminOnly) {
      return profile?.is_super_admin;
    }
    return true;
  });

  const backToSiteNavLink = (
    <Link
      key="back-to-site"
      href="/"
      className="flex min-h-[2.75rem] items-center gap-3 px-3 py-2 rounded-lg transition-colors text-[var(--admin-text-muted)] hover:bg-[var(--admin-card-bg)] hover:text-[var(--admin-text)]"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
          />
        </svg>
      </span>
      <span className="text-sm font-medium uppercase tracking-wide">Back to site</span>
    </Link>
  );

  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <aside className="hidden shrink-0 lg:flex lg:flex-col lg:w-[var(--admin-sidebar-width)] bg-[var(--admin-sidebar-bg)] border-r border-[var(--admin-border)] h-screen sticky top-0">
      <div className="flex flex-col h-full">
        {/* Logo/Brand */}
        <div className="p-6">
          <Link href="/" className="inline-flex flex-col gap-0.5">
            <span className="inline-flex items-baseline gap-0">
              <span className="text-[var(--admin-text)] font-semibold text-xl leading-none">Diffuse</span>
              <span className="text-[var(--admin-accent)] font-semibold text-xl leading-none">.AI</span>
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] leading-tight">
              {siteName.toUpperCase()}
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-3 [scrollbar-gutter:stable]">
          <div className="space-y-1">
            {filteredNavItems.flatMap((item, idx) => {
              const active = isActive(item);
              const navLink = (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex min-h-[2.75rem] items-center gap-3 px-3 py-2 rounded-lg transition-all
                    ${active 
                      ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]' 
                      : 'text-white hover:bg-[var(--admin-card-bg)]'
                    }
                  `}
                >
                  <span className={`shrink-0 ${active ? "text-[var(--admin-accent)]" : "text-white"}`}>
                    {getIcon(item.icon)}
                  </span>
                  <span className={`text-sm font-medium whitespace-nowrap ${active ? "text-[var(--admin-accent)]" : "text-white"}`}>
                    {item.label}
                  </span>
                </Link>
              );

              const insertBack = idx === filteredNavItems.length - 1;

              return insertBack ? [navLink, backToSiteNavLink] : [navLink];
            })}
          </div>
        </nav>

        {/* User profile — menu opens upward, same width as grey card */}
        <div className="p-4">
          <div className="relative rounded-lg bg-[var(--admin-card-bg)] text-[var(--admin-text)]">
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex flex-col items-stretch gap-0.5 px-3 py-3 rounded-lg text-left transition-all hover:bg-[var(--admin-table-row-hover)]/80"
            >
              <div className="text-sm font-medium truncate">
                {profile?.full_name || 'User'}
              </div>
              <div className="text-[var(--admin-text-muted)] text-[11px] font-semibold tracking-wide">
                {formatRoleLabel(profile)}
              </div>
            </button>

            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 z-50 mb-2 w-full min-w-0 rounded-lg bg-[var(--admin-card-bg)] text-[var(--admin-text)] shadow-lg overflow-hidden max-h-[min(70vh,24rem)] overflow-y-auto [&_a]:text-[var(--admin-text)]">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--admin-table-row-hover)] transition-all text-sm"
                  onClick={() => setShowUserMenu(false)}
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Profile</span>
                </Link>
                <div className="border-t border-[var(--admin-border)]" />
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-[var(--admin-table-row-hover)] transition-all text-sm text-left"
                >
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
