"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserProfile } from "@/lib/types/database";
import { Avatar } from "@/components/Avatar";
import { EditUserModal } from "@/components/EditUserModal";

// Dropdown Menu Component with smart positioning
function DropdownMenu({
  userId,
  position,
  onClose,
  onEdit,
  onNewsletter,
  onAdmin,
  onSuperAdmin,
  onRemoveSuperAdmin,
  onRemoveUser,
  user,
  currentUser,
}: {
  userId: string;
  position: 'up' | 'down';
  onClose: () => void;
  onEdit: () => void;
  onNewsletter: () => void;
  onAdmin: () => void;
  onSuperAdmin: () => void;
  onRemoveSuperAdmin: () => void;
  onRemoveUser: () => void;
  user: UserProfile;
  currentUser: any;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const button = document.querySelector(`[data-user-id="${userId}"]`) as HTMLElement;
    if (button && dropdownRef.current) {
      const rect = button.getBoundingClientRect();
      if (position === 'up') {
        setStyle({
          bottom: `${window.innerHeight - rect.top + 4}px`,
          right: `${window.innerWidth - rect.right}px`,
        });
      } else {
        setStyle({
          top: `${rect.bottom + 4}px`,
          right: `${window.innerWidth - rect.right}px`,
        });
      }
    }
  }, [userId, position]);

  return (
    <div
      ref={dropdownRef}
      className="fixed w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
      style={style}
    >
      <div className="py-1">
        <button
          onClick={onEdit}
          className="w-full text-left px-4 py-2 text-sm text-[color:var(--color-dark)] hover:bg-gray-100 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Profile
        </button>
        <button
          onClick={onNewsletter}
          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
            user.newsletter_subscribed ? "text-red-600" : "text-green-600"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {user.newsletter_subscribed ? "Revoke Newsletter" : "Grant Newsletter"}
        </button>
        {user.id !== currentUser.id && (
          <>
            {!user.is_super_admin && (
              <>
                <button
                  onClick={onAdmin}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                    user.is_admin ? "text-red-600" : "text-[color:var(--color-riviera-blue)]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  {user.is_admin ? "Remove Admin" : "Make Admin"}
                </button>
                <button
                  onClick={onSuperAdmin}
                  className="w-full text-left px-4 py-2 text-sm text-purple-600 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Make Super Admin
                </button>
              </>
            )}
            {user.is_super_admin && (
              <button
                onClick={onRemoveSuperAdmin}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Remove Super Admin
              </button>
            )}
            <div className="border-t border-gray-100 my-1"></div>
            <button
              onClick={onRemoveUser}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove User
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const SORT_OPTIONS = [
  { value: "default", label: "Default (newest first)" },
  { value: "name-asc", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "email-asc", label: "Email (A–Z)" },
  { value: "email-desc", label: "Email (Z–A)" },
  { value: "username-asc", label: "Username (A–Z)" },
  { value: "username-desc", label: "Username (Z–A)" },
  { value: "joined-asc", label: "Date joined (earliest)" },
  { value: "joined-desc", label: "Date joined (latest)" },
] as const;

export default function UsersAdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ [key: string]: 'up' | 'down' }>({});
  const [sortOption, setSortOption] = useState<string>("default");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [newsletterFilter, setNewsletterFilter] = useState<string>("all");
  const [newsletterDropdownOpen, setNewsletterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showActionsInfo, setShowActionsInfo] = useState(false);
  const actionsInfoRef = useRef<HTMLDivElement>(null);
  const actionsInfoButtonRef = useRef<HTMLButtonElement>(null);
  const actionsInfoPopoverRef = useRef<HTMLDivElement>(null);
  const [actionsInfoPosition, setActionsInfoPosition] = useState({ top: 0, left: 0 });
  const router = useRouter();
  const supabase = createClient();

  const sortedUsers = [...users].sort((a, b) => {
    if (sortOption === "default") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    const [key, dir] = sortOption.split("-") as [string, string];
    const mul = dir === "asc" ? 1 : -1;
    if (key === "name") {
      const na = (a.full_name || "").toLowerCase();
      const nb = (b.full_name || "").toLowerCase();
      return mul * na.localeCompare(nb);
    }
    if (key === "username") {
      const ua = (a.username || "").toLowerCase();
      const ub = (b.username || "").toLowerCase();
      return mul * ua.localeCompare(ub);
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
      if (newsletterFilter === "subscribed" && !user.newsletter_subscribed) return false;
      if (newsletterFilter === "not_subscribed" && user.newsletter_subscribed) return false;
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const name = (user.full_name || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const username = (user.username || "").toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !username.includes(q)) return false;
    }
    return true;
  });

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const POPOVER_WIDTH = 288; // w-72 = 18rem
  useEffect(() => {
    if (!showActionsInfo || !actionsInfoButtonRef.current) return;
    const btn = actionsInfoButtonRef.current;
    const update = () => {
      const r = btn.getBoundingClientRect();
      const left = Math.max(8, r.left - POPOVER_WIDTH);
      setActionsInfoPosition({ top: r.bottom + 4, left });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showActionsInfo]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (showActionsInfo && !actionsInfoRef.current?.contains(target) && !actionsInfoPopoverRef.current?.contains(target)) {
        setShowActionsInfo(false);
      }
      if (sortDropdownOpen && sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setSortDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setRoleDropdownOpen(false);
        setNewsletterDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showActionsInfo, sortDropdownOpen]);

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
      router.push("/admin");
      return;
    }

    setCurrentUser(profileData);
    loadUsers();
  }

  async function loadUsers() {
    const { data } = await supabase
      .from("user_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setUsers(data);
    }
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
      
      setOpenDropdown(null);
    } catch (err: any) {
      console.error("Error removing user:", err);
      alert("Error removing user: " + err.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          <p className="mt-2 text-sm text-[color:var(--color-medium)]">Loading users...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <header className="border-b border-[color:var(--color-border)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[color:var(--color-dark)]">User Management</h1>
              <p className="text-sm text-[color:var(--color-medium)]">
                Manage admin privileges (Super Admin Only)
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-dark)] hover:bg-gray-50"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-3 mb-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-blue-50 text-blue-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Total Users</p>
            <p className="text-2xl font-bold mt-1">{users.length}</p>
          </div>
          <div className="rounded-lg bg-purple-50 text-purple-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Admins</p>
            <p className="text-2xl font-bold mt-1">
              {users.filter(u => u.is_admin || u.is_super_admin).length}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 text-green-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Regular Users</p>
            <p className="text-2xl font-bold mt-1">
              {users.filter(u => !u.is_admin && !u.is_super_admin).length}
            </p>
          </div>
          <div className="rounded-lg bg-[#3391af]/10 text-[#3391af] p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Newsletter Subscribers</p>
            <p className="text-2xl font-bold mt-1">
              {users.filter(u => u.newsletter_subscribed).length}
            </p>
          </div>
        </div>

        {/* Search + Sort + Filter - above table */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="flex-1 min-w-[200px] max-w-md">
            <label htmlFor="user-search" className="sr-only">Search users</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--color-medium)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                id="user-search"
                type="search"
                placeholder="Search name, email, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-[color:var(--color-border)] bg-white pl-9 pr-3 py-2 text-sm text-[color:var(--color-dark)] placeholder-[color:var(--color-medium)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-riviera-blue)]/30 focus:border-[color:var(--color-riviera-blue)]"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" ref={filterDropdownRef}>
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setSortDropdownOpen(!sortDropdownOpen);
                  setRoleDropdownOpen(false);
                  setNewsletterDropdownOpen(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--color-dark)] hover:bg-gray-50 transition"
              >
                <svg className="w-4 h-4 text-[color:var(--color-medium)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                Sort: {SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "Default"}
                <svg className={`w-4 h-4 text-[color:var(--color-medium)] transition ${sortDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-[color:var(--color-border)] bg-white py-1 shadow-lg z-50">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSortOption(opt.value);
                        setSortDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${sortOption === opt.value ? "bg-[color:var(--color-riviera-blue)]/10 text-[color:var(--color-riviera-blue)] font-semibold" : "text-[color:var(--color-dark)] hover:bg-gray-50"}`}
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
                onClick={() => { setRoleDropdownOpen(!roleDropdownOpen); setNewsletterDropdownOpen(false); setSortDropdownOpen(false); }}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--color-dark)] hover:bg-gray-50 transition"
              >
                Role: {roleFilter === "all" ? "All" : roleFilter === "super_admin" ? "Super Admin" : roleFilter === "admin" ? "Admin" : "User"}
                <svg className={`w-4 h-4 text-[color:var(--color-medium)] transition ${roleDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {roleDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[color:var(--color-border)] bg-white py-1 shadow-lg z-50">
                  {[
                    { value: "all", label: "All roles" },
                    { value: "super_admin", label: "Super Admin" },
                    { value: "admin", label: "Admin" },
                    { value: "user", label: "User" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setRoleFilter(opt.value); setRoleDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm ${roleFilter === opt.value ? "bg-[color:var(--color-riviera-blue)]/10 text-[color:var(--color-riviera-blue)] font-semibold" : "text-[color:var(--color-dark)] hover:bg-gray-50"}`}
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
                onClick={() => { setNewsletterDropdownOpen(!newsletterDropdownOpen); setRoleDropdownOpen(false); setSortDropdownOpen(false); }}
                className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--color-border)] bg-white px-3 py-2 text-sm font-medium text-[color:var(--color-dark)] hover:bg-gray-50 transition"
              >
                Newsletter: {newsletterFilter === "all" ? "All" : newsletterFilter === "subscribed" ? "Subscribed" : "Not subscribed"}
                <svg className={`w-4 h-4 text-[color:var(--color-medium)] transition ${newsletterDropdownOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {newsletterDropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[color:var(--color-border)] bg-white py-1 shadow-lg z-50">
                  {[
                    { value: "all", label: "All" },
                    { value: "subscribed", label: "Subscribed" },
                    { value: "not_subscribed", label: "Not subscribed" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => { setNewsletterFilter(opt.value); setNewsletterDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm ${newsletterFilter === opt.value ? "bg-[color:var(--color-riviera-blue)]/10 text-[color:var(--color-riviera-blue)] font-semibold" : "text-[color:var(--color-dark)] hover:bg-gray-50"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-[color:var(--color-border)] overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Newsletter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">
                  <span
                    className="inline-flex items-center gap-0.5"
                    ref={actionsInfoRef}
                    onMouseEnter={() => setShowActionsInfo(true)}
                    onMouseLeave={(e) => {
                      const related = e.relatedTarget as Node | null;
                      if (related && actionsInfoPopoverRef.current?.contains(related)) return;
                      setShowActionsInfo(false);
                    }}
                  >
                    Actions
                    <button
                      ref={actionsInfoButtonRef}
                      type="button"
                      className="inline-flex items-center justify-center w-3.5 h-3.5 text-[10px] font-bold text-white bg-[color:var(--color-riviera-blue)] rounded-full hover:opacity-90 transition shrink-0 pointer-events-none"
                      aria-label="Info about actions and roles"
                    >
                      i
                    </button>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && users.length > 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-[color:var(--color-medium)]">
                    No users match your search or filters.
                  </td>
                </tr>
              )}
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={user.avatar_url} name={user.full_name} email={user.email} size="sm" />
                      <div>
                        <div className="text-sm font-medium text-[color:var(--color-dark)]">
                          {user.full_name || "No name"}
                          {user.id === currentUser.id && (
                            <span className="ml-2 text-xs text-[color:var(--color-medium)]">(You)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-medium)]">
                    {user.username ? `@${user.username}` : "Not set"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-medium)]">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      user.is_super_admin ? "bg-purple-100 text-purple-700" :
                      user.is_admin ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {user.is_super_admin ? "Super Admin" : user.is_admin ? "Admin" : "User"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {user.newsletter_subscribed ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Subscribed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-semibold">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Not Subscribed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-medium)]">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-left">
                    <div className="relative">
                      <button
                        data-user-id={user.id}
                        onClick={(e) => {
                          const button = e.currentTarget;
                          const rect = button.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const spaceAbove = rect.top;
                          const dropdownHeight = 350; // Approximate dropdown height
                          
                          // Determine if dropdown should open upward
                          const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
                          
                          if (openDropdown === user.id) {
                            setOpenDropdown(null);
                          } else {
                            setDropdownPosition({ ...dropdownPosition, [user.id]: shouldOpenUp ? 'up' : 'down' });
                            setOpenDropdown(user.id);
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-[color:var(--color-dark)] bg-gray-100 hover:bg-gray-200 rounded-md transition flex items-center gap-1"
                      >
                        Actions
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {openDropdown === user.id && (
                        <DropdownMenu
                          userId={user.id}
                          position={dropdownPosition[user.id] || 'down'}
                          onClose={() => setOpenDropdown(null)}
                          onEdit={() => {
                            setEditingUser(user);
                            setOpenDropdown(null);
                          }}
                          onNewsletter={() => {
                            toggleNewsletterStatus(user.id, user.newsletter_subscribed || false);
                            setOpenDropdown(null);
                          }}
                          onAdmin={() => {
                            toggleAdminStatus(user.id, user.is_admin);
                            setOpenDropdown(null);
                          }}
                          onSuperAdmin={() => {
                            toggleSuperAdminStatus(user.id, user.is_super_admin);
                            setOpenDropdown(null);
                          }}
                          onRemoveSuperAdmin={() => {
                            toggleSuperAdminStatus(user.id, true);
                            setOpenDropdown(null);
                          }}
                          onRemoveUser={() => {
                            removeUser(user.id, user.full_name || user.email);
                          }}
                          user={user}
                          currentUser={currentUser}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="py-12 text-center text-sm text-[color:var(--color-medium)]">
              No users found
            </div>
          )}
        </div>
      </main>

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

      {/* Close dropdown when clicking outside */}
      {openDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenDropdown(null)}
        />
      )}

      {/* Actions info popover - portal so it positions under the (i) button */}
      {showActionsInfo && typeof document !== "undefined" && createPortal(
        <div
          ref={actionsInfoPopoverRef}
          className="fixed w-72 p-4 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-[100]"
          style={{ top: actionsInfoPosition.top, left: actionsInfoPosition.left }}
          onMouseLeave={() => setShowActionsInfo(false)}
        >
          <div className="absolute -right-2 top-4 w-4 h-4 bg-gray-900 transform rotate-45" />
          <h4 className="font-semibold mb-2">Actions &amp; roles</h4>
          <ul className="space-y-1.5 text-gray-200">
            <li><strong>Edit Profile:</strong> Change name, username</li>
            <li><strong>Grant/Revoke Newsletter:</strong> Toggle newsletter subscription</li>
            <li><strong>Make/Remove Admin:</strong> Admin can create and manage articles</li>
            <li><strong>Make/Remove Super Admin:</strong> Can also manage users and assign roles</li>
            <li><strong>Remove User:</strong> Permanently delete the account</li>
          </ul>
          <p className="mt-2 pt-2 border-t border-gray-700 text-gray-300">
            <strong>Admin</strong> = manage articles. <strong>Super Admin</strong> = everything + user management.
          </p>
        </div>,
        document.body
      )}
    </div>
  );
}

