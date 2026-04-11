"use client";

import { useEffect, useState, useRef, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile } from "@/lib/types/database";

type NewsletterSubRow = { tenant_name: string; subscribed_at: string | null };

type AdminUserRow = UserProfile & {
  newsletter_tenant_names?: string[];
  /** Per-tenant newsletter opt-ins (all sites; not scoped to current admin tenant) */
  newsletter_subscriptions?: NewsletterSubRow[];
};
import { Avatar } from "@/components/Avatar";
import { EditUserModal } from "@/components/EditUserModal";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";

function roleLabel(u: UserProfile): string {
  if (u.is_super_admin) return "SUPER ADMIN";
  if (u.is_admin) return "ADMIN";
  return "USER";
}

const SORT_OPTIONS = [
  { value: "joined-desc", label: "Date joined (latest)" },
  { value: "joined-asc", label: "Date joined (earliest)" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "email-asc", label: "Email (A–Z)" },
  { value: "email-desc", label: "Email (Z–A)" },
  { value: "newsletters-asc", label: "Newsletters (A–Z)" },
  { value: "newsletters-desc", label: "Newsletters (Z–A)" },
] as const;

export default function UsersAdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<string>("joined-desc");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [newsletterFilter, setNewsletterFilter] = useState<string>("all");
  const [newsletterDropdownOpen, setNewsletterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownMobileRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const supabase = createClient();

  function newsletterSortKey(u: AdminUserRow): string {
    const names = u.newsletter_tenant_names ?? u.newsletter_subscriptions?.map((s) => s.tenant_name) ?? [];
    if (names.length === 0) return "";
    return names.join(", ").toLowerCase();
  }

  /** All newsletter lines for display (per-tenant rows + legacy profile flag if needed). */
  function newsletterDisplayRows(u: AdminUserRow): NewsletterSubRow[] {
    const subs = u.newsletter_subscriptions ?? [];
    if (subs.length > 0) return subs;
    if (u.newsletter_subscribed) {
      return [
        {
          tenant_name: "Newsletter (account)",
          subscribed_at: u.newsletter_subscribed_at ?? null,
        },
      ];
    }
    return [];
  }

  function formatSubDate(iso: string | null): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "—";
    }
  }

  const sortedUsers = [...users].sort((a, b) => {
    const [key, dir] = sortOption.split("-") as [string, string];
    const mul = dir === "asc" ? 1 : -1;
    if (key === "name") {
      const na = (a.full_name || "").toLowerCase();
      const nb = (b.full_name || "").toLowerCase();
      return mul * na.localeCompare(nb);
    }
    if (key === "newsletters") {
      const na = newsletterSortKey(a);
      const nb = newsletterSortKey(b);
      return mul * na.localeCompare(nb);
    }
    if (key === "email") {
      const ea = (a.email || "").toLowerCase();
      const eb = (b.email || "").toLowerCase();
      return mul * ea.localeCompare(eb);
    }
    if (key === "joined") {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return mul * (ta - tb);
    }
    return 0;
  });

  const filteredUsers = sortedUsers.filter((user) => {
    if (roleFilter !== "all") {
      if (roleFilter === "super_admin" && !user.is_super_admin) return false;
      if (roleFilter === "admin" && (!user.is_admin || user.is_super_admin)) return false;
      if (roleFilter === "user" && (user.is_admin || user.is_super_admin)) return false;
    }
    if (newsletterFilter !== "all") {
      const hasTenantSubs = (user.newsletter_subscriptions?.length ?? 0) > 0;
      const subscribed = hasTenantSubs || user.newsletter_subscribed;
      if (newsletterFilter === "subscribed" && !subscribed) return false;
      if (newsletterFilter === "not_subscribed" && subscribed) return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const name = (user.full_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const newsletters = (user.newsletter_tenant_names ?? user.newsletter_subscriptions?.map((s) => s.tenant_name) ?? [])
        .join(" ")
        .toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !newsletters.includes(q)) return false;
    }
    return true;
  });

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (sortDropdownOpen && sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setSortDropdownOpen(false);
      }
      const inFilter =
        (filterDropdownRef.current?.contains(target) ?? false) ||
        (filterDropdownMobileRef.current?.contains(target) ?? false);
      if (!inFilter) {
        setRoleDropdownOpen(false);
        setNewsletterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortDropdownOpen]);

  async function checkSuperAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData?.is_super_admin) {
      alert("Only super admins can access this page!");
      router.push("/admin/articles");
      return;
    }

    setCurrentUser(profileData);
    loadUsers();
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    const j = (await res.json()) as { users?: AdminUserRow[]; error?: string };
    if (!res.ok) {
      console.error(j.error ?? "Failed to load users");
      setUsers([]);
      setLoading(false);
      return;
    }
    setUsers(Array.isArray(j.users) ? j.users : []);
    setLoading(false);
  }

  async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    const action = currentStatus ? "remove" : "grant";
    if (!confirm(`Are you sure you want to ${action} admin privileges for this user?`)) {
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ is_admin: !currentStatus })
      .eq("id", userId);

    if (!error) {
      loadUsers();
      alert(`Admin privileges ${action === "grant" ? "granted" : "removed"}!`);
    } else {
      alert("Error updating user: " + error.message);
    }
  }

  async function toggleSuperAdminStatus(userId: string, currentStatus: boolean) {
    const action = currentStatus ? "remove" : "grant";
    if (!confirm(`Are you sure you want to ${action} SUPER ADMIN privileges for this user?\n\nSuper Admins can manage all users and assign admin roles.`)) {
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ 
        is_super_admin: !currentStatus,
        is_admin: !currentStatus // Super admins are also admins
      })
      .eq("id", userId);

    if (!error) {
      loadUsers();
      alert(`Super Admin privileges ${action === "grant" ? "granted" : "removed"}!`);
    } else {
      alert("Error updating user: " + error.message);
    }
  }

  async function toggleNewsletterStatus(userId: string, currentStatus: boolean) {
    const action = currentStatus ? "revoke" : "grant";
    if (!confirm(`Are you sure you want to ${action} newsletter subscription for this user?`)) {
      return;
    }

    const { error } = await supabase
      .from("user_profiles")
      .update({ newsletter_subscribed: !currentStatus })
      .eq("id", userId);

    if (!error) {
      loadUsers();
      alert(`Newsletter subscription ${action === "grant" ? "granted" : "revoked"}!`);
    } else {
      alert("Error updating user: " + error.message);
    }
  }

  async function removeUser(userId: string, userName: string) {
    if (!confirm(`Are you sure you want to remove user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    if (!confirm(`WARNING: This will permanently delete the user account and all associated data. Are you absolutely sure?`)) {
      return;
    }

    try {
      // Call the secure API route to delete the user
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      loadUsers();
      
      if (data.warning) {
        alert(`User removed with warning: ${data.warning}`);
      } else {
        alert("User removed successfully!");
      }
      
      setSelectedUserId(null);
    } catch (err: any) {
      console.error("Error removing user:", err);
      alert("Error removing user: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent" />
          <p className="mt-4 text-sm text-[var(--admin-text-muted)]">Loading users…</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) ?? null : null;

  function userFilterCard(ref: RefObject<HTMLDivElement | null>, className: string) {
    return (
      <div ref={ref} className={className}>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
          Filter
        </h3>
        <div className="flex flex-col gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setRoleDropdownOpen(!roleDropdownOpen);
                setNewsletterDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-table-row-hover)]"
            >
              <span className="truncate">
                Role:{" "}
                {roleFilter === "all"
                  ? "All"
                  : roleFilter === "super_admin"
                    ? "Super Admin"
                    : roleFilter === "admin"
                      ? "Admin"
                      : "User"}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-[var(--admin-text-muted)] transition ${roleDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {roleDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] py-1 shadow-lg">
                {[
                  { value: "all", label: "All roles" },
                  { value: "super_admin", label: "Super Admin" },
                  { value: "admin", label: "Admin" },
                  { value: "user", label: "User" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setRoleFilter(opt.value);
                      setRoleDropdownOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm ${roleFilter === opt.value ? "bg-[var(--admin-accent)]/10 font-semibold text-[var(--admin-accent)]" : "text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNewsletterDropdownOpen(!newsletterDropdownOpen);
                setRoleDropdownOpen(false);
                setSortDropdownOpen(false);
              }}
              className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-table-row-hover)]"
            >
              <span className="truncate">
                Newsletter:{" "}
                {newsletterFilter === "all"
                  ? "All"
                  : newsletterFilter === "subscribed"
                    ? "Subscribed"
                    : "Not subscribed"}
              </span>
              <svg
                className={`h-4 w-4 shrink-0 text-[var(--admin-text-muted)] transition ${newsletterDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {newsletterDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] py-1 shadow-lg">
                {[
                  { value: "all", label: "All" },
                  { value: "subscribed", label: "Subscribed" },
                  { value: "not_subscribed", label: "Not subscribed" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setNewsletterFilter(opt.value);
                      setNewsletterDropdownOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm ${newsletterFilter === opt.value ? "bg-[var(--admin-accent)]/10 font-semibold text-[var(--admin-accent)]" : "text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const userActionsSections = selectedUser
    ? [
        {
          title: "User",
          items: [
            {
              icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              ),
              label: "Edit profile",
              onClick: () => setEditingUser(selectedUser),
            },
            {
              icon: (
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
              label: selectedUser.newsletter_subscribed ? "Revoke newsletter" : "Grant newsletter",
              onClick: () => toggleNewsletterStatus(selectedUser.id, selectedUser.newsletter_subscribed || false),
            },
            ...(selectedUser.id !== currentUser.id && !selectedUser.is_super_admin
              ? [
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                    label: selectedUser.is_admin ? "Remove admin" : "Make admin",
                    onClick: () => toggleAdminStatus(selectedUser.id, selectedUser.is_admin),
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                    ),
                    label: "Make super admin",
                    onClick: () => toggleSuperAdminStatus(selectedUser.id, selectedUser.is_super_admin),
                  },
                ]
              : []),
            ...(selectedUser.id !== currentUser.id && selectedUser.is_super_admin
              ? [
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    label: "Remove super admin",
                    onClick: () => toggleSuperAdminStatus(selectedUser.id, true),
                  },
                ]
              : []),
            ...(selectedUser.id !== currentUser.id
              ? [
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    ),
                    label: "Remove user",
                    variant: "danger" as const,
                    onClick: () => removeUser(selectedUser.id, selectedUser.full_name || selectedUser.email),
                  },
                ]
              : []),
          ],
        },
      ]
    : [
        {
          title: "User",
          customContent: (
            <p className="px-1 text-sm text-[var(--admin-text-muted)]">
              Select a user in the list to change permissions or remove the account.
            </p>
          ),
        },
      ];

  const actionsPanel = (
    <div className="w-64 overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)]">
      {userFilterCard(filterDropdownRef, "border-b border-[var(--admin-border)] p-4")}
      <AdminActionsPanel embedded sections={userActionsSections} />
    </div>
  );

  return (
    <>
      <AdminPageHeader 
        title="Users"
        reserveActionsPanelSpace
      />

      <AdminPageLayout actionsColumnClassName="xl:pt-11" actionsPanel={actionsPanel}>
        {/* Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">User Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="min-w-0 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] px-3 py-3 sm:px-4 sm:py-3.5 hover:border-[var(--admin-accent)]/50 transition-all">
              <div className="text-base sm:text-lg font-semibold tabular-nums text-[var(--admin-accent)] leading-tight truncate">{users.length}</div>
              <div className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] leading-snug">Total Users</div>
            </div>
            <div className="min-w-0 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] px-3 py-3 sm:px-4 sm:py-3.5 hover:border-[var(--admin-accent)]/50 transition-all">
              <div className="text-base sm:text-lg font-semibold tabular-nums text-[var(--admin-accent)] leading-tight truncate">{users.filter(u => u.is_admin || u.is_super_admin).length}</div>
              <div className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] leading-snug">Admins</div>
            </div>
            <div className="min-w-0 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] px-3 py-3 sm:px-4 sm:py-3.5 hover:border-[var(--admin-accent)]/50 transition-all">
              <div className="text-base sm:text-lg font-semibold tabular-nums text-[var(--admin-accent)] leading-tight truncate">{users.filter(u => !u.is_admin && !u.is_super_admin).length}</div>
              <div className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] leading-snug">Regular Users</div>
            </div>
            <div className="min-w-0 bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] px-3 py-3 sm:px-4 sm:py-3.5 hover:border-[var(--admin-accent)]/50 transition-all">
              <div className="text-base sm:text-lg font-semibold tabular-nums text-[var(--admin-accent)] leading-tight truncate">
                {users.filter((u) => (u.newsletter_subscriptions?.length ?? 0) > 0 || u.newsletter_subscribed).length}
              </div>
              <div className="mt-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)] leading-snug">Newsletter Subscribers</div>
            </div>
          </div>
        </div>

        {/* Search (2/3) + Sort (1/3); filters + user actions in right column (mobile: card below) */}
        <h2 className="text-xl font-semibold text-white mb-4">All Users</h2>
        <div className="mb-3 flex w-full min-w-0 flex-row flex-wrap items-center gap-3">
          <div className="min-w-0 flex-[2] basis-0">
            <label htmlFor="user-search" className="sr-only">Search users</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="user-search"
                type="search"
                placeholder="Search name, email, newsletters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] py-2 pl-9 pr-3 text-sm text-[var(--admin-text)] placeholder-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/30"
              />
            </div>
          </div>
          <div className="relative min-w-0 flex-1 basis-0" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setSortDropdownOpen(!sortDropdownOpen);
                setRoleDropdownOpen(false);
                setNewsletterDropdownOpen(false);
              }}
              className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2 text-sm font-medium text-[var(--admin-text)] transition hover:bg-[var(--admin-table-row-hover)]"
            >
              <svg className="w-4 h-4 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              Sort: {SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "Date joined (latest)"}
              <svg className={`w-4 h-4 text-[var(--admin-text-muted)] transition ${sortDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {sortDropdownOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] py-1 shadow-lg">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSortOption(opt.value);
                      setSortDropdownOpen(false);
                    }}
                    className={`block w-full px-4 py-2 text-left text-sm ${sortOption === opt.value ? "bg-[var(--admin-accent)]/10 font-semibold text-[var(--admin-accent)]" : "text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mb-4 w-full max-w-md overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] xl:hidden">
          {userFilterCard(filterDropdownMobileRef, "border-b border-[var(--admin-border)] p-4")}
          <AdminActionsPanel embedded sections={userActionsSections} />
        </div>

        {/* Users Table */}
        <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-[var(--admin-table-header-bg)]">
              <tr>
                <th className="pl-4 pr-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--admin-text)]">User</th>
                <th className="pl-2 pr-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--admin-text)] min-w-[12rem]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--admin-text)] whitespace-nowrap min-w-[10rem]">
                  Newsletters
                </th>
                <th className="px-4 py-3 text-left align-bottom w-24">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text)]">ACTIVE</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && users.length > 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                    No users match your search or filters.
                  </td>
                </tr>
              )}
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedUserId(user.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedUserId(user.id);
                    }
                  }}
                  className={`border-t border-[var(--admin-border)] cursor-pointer transition ${
                    selectedUserId === user.id
                      ? "bg-[var(--admin-accent)]/10"
                      : "hover:bg-[var(--admin-table-row-hover)]"
                  }`}
                >
                  <td className="pl-4 pr-2 py-4 align-middle">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar
                        src={user.avatar_url}
                        name={user.full_name}
                        email={user.email}
                        size="sm"
                        fallbackTone="accent"
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--admin-text)] leading-snug">
                          {user.full_name || "No name"}
                          {user.id === currentUser.id && (
                            <span className="ml-2 text-xs text-[var(--admin-text-muted)]">(You)</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-xs font-semibold tracking-wide text-[var(--admin-text-muted)]">
                          {roleLabel(user)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="pl-2 pr-4 py-4 align-middle text-sm text-[var(--admin-text)] break-words max-w-md">
                    {user.email}
                  </td>
                  <td className="px-4 py-4 align-middle text-sm text-[var(--admin-text)] min-w-[12rem]">
                    {(() => {
                      const rows = newsletterDisplayRows(user);
                      return rows.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {rows.map((row, idx) => (
                            <div key={`${row.tenant_name}-${idx}`} className="leading-snug border-b border-[var(--admin-border)]/60 pb-2 last:border-0 last:pb-0">
                              <div className="font-medium text-[var(--admin-text)]">{row.tenant_name}</div>
                              <div className="text-xs text-[var(--admin-text-muted)] mt-0.5">
                                Subscribed {formatSubDate(row.subscribed_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[var(--admin-text-muted)]">None</span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4 align-middle">
                    {(() => {
                      const rows = newsletterDisplayRows(user);
                      return rows.length > 0 ? (
                        <div className="flex flex-col gap-2">
                          {rows.map((row, idx) => (
                            <div
                              key={`sub-${row.tenant_name}-${idx}`}
                              className="flex items-center justify-center border-b border-[var(--admin-border)]/60 pb-2 last:border-0 last:pb-0 min-h-[2.25rem]"
                              title={`Subscribed ${formatSubDate(row.subscribed_at)}`}
                            >
                              <span className="font-semibold text-emerald-400 text-lg" aria-hidden>
                                ✓
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="flex justify-center text-lg font-semibold text-red-400/90" aria-hidden>
                          ✕
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {users.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--admin-text-muted)]">
              No users found
            </div>
          )}
        </div>

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onUpdate={() => {
            loadUsers();
            setEditingUser(null);
          }}
        />
      )}

      </AdminPageLayout>
    </>
  );
}

