"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminTenantSwitcher } from "@/components/admin/AdminTenantSwitcher";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  exact?: boolean;
}

interface AdminBottomNavProps {
  profile: any;
}

function formatRoleLabel(profile: any): string {
  if (profile?.is_super_admin) return "SUPER ADMIN";
  if (profile?.is_admin) return "ADMIN";
  return "USER";
}

export function AdminBottomNav({ profile }: AdminBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [showMore, setShowMore] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const primaryNavItems: NavItem[] = [
    { icon: "dashboard", label: "Dashboard", href: "/admin/diffuse" },
    { icon: "article", label: "Articles", href: "/admin/articles" },
    { icon: "analytics", label: "Analytics", href: "/admin/analytics" },
  ];

  const moreNavItems: NavItem[] = [
    { icon: "newsletter", label: "Newsletter", href: "/admin/newsletter" },
    { icon: "dollar", label: "Ad Quoter", href: "/admin/ad-quoter" },
    ...(profile?.is_super_admin ? [
      { icon: "layers", label: "All Sites", href: "/admin/overview", exact: true },
      { icon: "megaphone", label: "Ad Manager", href: "/admin/ads" },
      { icon: "users", label: "Users", href: "/admin/users" },
      { icon: "building", label: "Tenants", href: "/admin/tenants" },
    ] : []),
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname?.startsWith(item.href);
  };

  const isMoreActive = moreNavItems.some(item => isActive(item));

  const getIcon = (iconName: string, className = "w-6 h-6") => {
    const icons: Record<string, ReactElement> = {
      dashboard: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      article: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      analytics: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      newsletter: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      email: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      dollar: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      megaphone: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      users: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      building: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      layers: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-1 1.732l-7 4a2 2 0 01-2 0l-7-4A2 2 0 014 8V6zM4 14a2 2 0 002 1.732l7 4a2 2 0 002 0l7-4A2 2 0 0020 14v-2M4 10a2 2 0 002 1.732l7 4a2 2 0 002 0l7-4A2 2 0 0020 10V8" />
        </svg>
      ),
      diffuse: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      user: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      more: (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
    };
    return icons[iconName] || icons.dashboard;
  };

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)]">
        <AdminTenantSwitcher compact />
        <div className="flex h-16 items-stretch justify-between gap-0 px-1">
          {primaryNavItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-all
                  ${active 
                    ? 'text-[var(--admin-accent)]' 
                    : 'text-white'
                  }
                `}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {getIcon(item.icon, "w-5 h-5")}
                </span>
                <span className="w-full truncate text-center text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
          
          <button
            type="button"
            onClick={() => setShowMore(!showMore)}
            className={`
              flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-all
              ${isMoreActive || showMore
                ? 'text-[var(--admin-accent)]' 
                : 'text-white'
              }
            `}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
              {getIcon("more", "w-5 h-5")}
            </span>
            <span className="w-full truncate text-center text-[10px] font-medium leading-none">More</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`
              flex min-w-0 flex-1 flex-col items-stretch justify-center px-1 py-0.5 transition-all
              ${showUserMenu ? 'text-[var(--admin-accent)]' : 'text-white'}
            `}
          >
            <div className="mx-0.5 min-h-[2.25rem] rounded-md bg-[var(--admin-card-bg)] px-1.5 py-1 flex flex-col items-center justify-center gap-0.5">
              <span className="w-full truncate text-center text-[10px] font-semibold leading-tight text-[var(--admin-text)]">
                {profile?.full_name || 'Account'}
              </span>
              <span className="w-full truncate text-center text-[8px] font-semibold leading-none text-[var(--admin-text-muted)] tracking-wide">
                {formatRoleLabel(profile)}
              </span>
            </div>
          </button>
        </div>
      </nav>

      {showMore && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowMore(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[var(--admin-sidebar-bg)] text-[var(--admin-text)] rounded-t-2xl max-h-[70vh] overflow-y-auto [&_a]:text-[var(--admin-text)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[var(--admin-text)] font-semibold text-lg">More Options</h3>
                <button
                  type="button"
                  onClick={() => setShowMore(false)}
                  className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-2">
                {moreNavItems.flatMap((item, idx) => {
                  const active = isActive(item);
                  const row = (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setShowMore(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg transition-all
                        ${active 
                          ? 'bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]' 
                          : 'text-[var(--admin-text)] hover:bg-[var(--admin-card-bg)]'
                        }
                      `}
                    >
                      {getIcon(item.icon)}
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  );

                  const insertBack = idx === moreNavItems.length - 1;

                  if (!insertBack) return [row];

                  return [
                    row,
                    <Link
                      key="back-to-site"
                      href="/"
                      onClick={() => setShowMore(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-card-bg)] hover:text-[var(--admin-text)]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden>
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
                    </Link>,
                  ];
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUserMenu && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowUserMenu(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-[var(--admin-sidebar-bg)] text-[var(--admin-text)] rounded-t-2xl max-h-[85vh] overflow-y-auto [&_a]:text-[var(--admin-text)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="rounded-lg bg-[var(--admin-card-bg)] mb-4 text-[var(--admin-text)]">
                <div className="flex items-start gap-3 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">
                      {profile?.full_name || 'User'}
                    </div>
                    <div className="text-[var(--admin-text-muted)] text-[11px] font-semibold tracking-wide mt-0.5">
                      {formatRoleLabel(profile)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu(false)}
                    className="text-[var(--admin-text-muted)] hover:text-[var(--admin-text)] shrink-0 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Link
                  href="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--admin-card-bg)] transition-all"
                >
                  {getIcon("user")}
                  <span className="text-sm font-medium">Profile</span>
                </Link>
                <div className="border-t border-[var(--admin-border)] my-2" />
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:bg-[var(--admin-card-bg)] transition-all text-left"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="lg:hidden h-16 shrink-0" aria-hidden />
    </>
  );
}
