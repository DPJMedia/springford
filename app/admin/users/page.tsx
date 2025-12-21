"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { UserProfile } from "@/lib/types/database";

export default function UsersAdminPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkSuperAdmin();
  }, []);

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

        {/* Info Box */}
        <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">How Admin Privileges Work</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Regular Users:</strong> Can view all published articles on the site</li>
            <li>• <strong>Admins:</strong> Can create, edit, schedule, and delete articles</li>
            <li>• <strong>Super Admin (You):</strong> Can do everything admins can + assign admin privileges to other users</li>
            <li>• <strong>Your email:</strong> {currentUser.email} - You are automatically a super admin</li>
          </ul>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-[color:var(--color-border)] overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Newsletter</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Joined</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[color:var(--color-dark)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-4 py-3 text-sm font-medium text-[color:var(--color-dark)]">
                    {user.full_name || "No name"}
                    {user.id === currentUser.id && (
                      <span className="ml-2 text-xs text-[color:var(--color-medium)]">(You)</span>
                    )}
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      {/* Newsletter subscription - can modify for yourself too */}
                      <button
                        onClick={() => toggleNewsletterStatus(user.id, user.newsletter_subscribed || false)}
                        className={`text-xs font-semibold hover:underline ${
                          user.newsletter_subscribed ? "text-red-600" : "text-green-600"
                        }`}
                      >
                        {user.newsletter_subscribed ? "Revoke Newsletter" : "Grant Newsletter"}
                      </button>
                      
                      {/* Admin/Super Admin controls - only for other users */}
                      {user.id !== currentUser.id && (
                        <>
                          <span className="text-[color:var(--color-medium)]">|</span>
                          {!user.is_super_admin && (
                            <>
                              <button
                                onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                                className={`text-xs font-semibold hover:underline ${
                                  user.is_admin ? "text-red-600" : "text-[color:var(--color-riviera-blue)]"
                                }`}
                              >
                                {user.is_admin ? "Remove Admin" : "Make Admin"}
                              </button>
                              <span className="text-[color:var(--color-medium)]">|</span>
                              <button
                                onClick={() => toggleSuperAdminStatus(user.id, user.is_super_admin)}
                                className="text-xs font-semibold text-purple-600 hover:underline"
                              >
                                Make Super Admin
                              </button>
                            </>
                          )}
                          {user.is_super_admin && (
                            <button
                              onClick={() => toggleSuperAdminStatus(user.id, true)}
                              className="text-xs font-semibold text-red-600 hover:underline"
                            >
                              Remove Super Admin
                            </button>
                          )}
                        </>
                      )}
                      {user.id === currentUser.id && (
                        <span className="text-xs text-[color:var(--color-medium)]">
                          (Admin roles locked)
                        </span>
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
    </div>
  );
}

