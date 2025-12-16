"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
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

    setUser({ ...user, profile: profileData });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          <p className="mt-2 text-sm text-[color:var(--color-medium)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <header className="border-b border-[color:var(--color-border)] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[color:var(--color-dark)]">My Profile</h1>
            <Link
              href="/"
              className="rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-dark)] hover:bg-gray-50"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg p-6 shadow-soft ring-1 ring-[color:var(--color-border)]">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-[color:var(--color-border)]">
            <div className="h-20 w-20 rounded-full bg-[color:var(--color-riviera-blue)] flex items-center justify-center text-white text-3xl font-bold">
              {user.profile?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-semibold text-[color:var(--color-dark)]">
                  {user.profile?.full_name || "No Name Set"}
                </h2>
                {user.profile?.account_number && (
                  <span className="inline-flex rounded-md bg-gray-100 px-2 py-1 text-xs font-mono font-semibold text-[color:var(--color-medium)]">
                    #{user.profile.account_number}
                  </span>
                )}
              </div>
              <p className="text-sm text-[color:var(--color-medium)]">{user.email}</p>
              <div className="flex gap-2 mt-2">
                {user.profile?.is_super_admin && (
                  <span className="inline-flex rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">
                    Super Admin
                  </span>
                )}
                {user.profile?.is_admin && !user.profile?.is_super_admin && (
                  <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                    Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Account Number
              </label>
              <p className="text-sm font-mono font-semibold text-[color:var(--color-dark)] bg-blue-50 px-4 py-2 rounded-md border border-blue-200">
                {user.profile?.account_number || "Generating..."}
              </p>
              <p className="text-xs text-[color:var(--color-medium)] mt-1">
                Use this unique ID for support inquiries and data tracking
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Full Name
              </label>
              <p className="text-sm text-[color:var(--color-medium)] bg-gray-50 px-4 py-2 rounded-md">
                {user.profile?.full_name || "Not set"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Username
              </label>
              <p className="text-sm text-[color:var(--color-medium)] bg-gray-50 px-4 py-2 rounded-md">
                {user.profile?.username || "Not set"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Email
              </label>
              <p className="text-sm text-[color:var(--color-medium)] bg-gray-50 px-4 py-2 rounded-md">
                {user.email}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Member Since
              </label>
              <p className="text-sm text-[color:var(--color-medium)] bg-gray-50 px-4 py-2 rounded-md">
                {new Date(user.profile?.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-[color:var(--color-border)] bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Profile editing functionality coming soon!</strong> You'll be able to update your name, username, and other profile details.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

