"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Stats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  scheduledArticles: number;
  totalViews: number;
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    scheduledArticles: 0,
    totalViews: 0,
  });
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

    if (!profileData?.is_admin && !profileData?.is_super_admin) {
      alert("You don't have admin access!");
      router.push("/");
      return;
    }

    setUser(user);
    setProfile(profileData);
    loadStats();
  }

  async function loadStats() {
    // Get all articles
    const { data: articles } = await supabase
      .from("articles")
      .select("status, view_count");

    if (articles) {
      const totalArticles = articles.length;
      const publishedArticles = articles.filter((a) => a.status === "published").length;
      const draftArticles = articles.filter((a) => a.status === "draft").length;
      const scheduledArticles = articles.filter((a) => a.status === "scheduled").length;
      const totalViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);

      setStats({
        totalArticles,
        publishedArticles,
        draftArticles,
        scheduledArticles,
        totalViews,
      });
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          <p className="mt-4 text-[color:var(--color-medium)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[color:var(--color-dark)]">Admin Dashboard</h1>
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-100 rounded-md transition"
            >
              ← Back to Site
            </Link>
          </div>
          <p className="text-[color:var(--color-medium)]">
            Welcome back, {profile?.full_name}
            {profile?.is_super_admin && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">Super Admin</span>}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl font-black text-[color:var(--color-riviera-blue)] mb-2">
              {stats.totalArticles}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              Total Articles
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl font-black text-green-600 mb-2">
              {stats.publishedArticles}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              Published
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl font-black text-gray-600 mb-2">
              {stats.draftArticles}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              Drafts
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl font-black text-yellow-600 mb-2">
              {stats.scheduledArticles}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              Scheduled
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl font-black text-purple-600 mb-2">
              {stats.totalViews.toLocaleString()}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              Total Views
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Article Management */}
          <Link
            href="/admin/articles"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-[color:var(--color-riviera-blue)] transition">
                <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] group-hover:text-[color:var(--color-riviera-blue)] transition">
                  Article Management
                </h3>
                <p className="text-sm text-[color:var(--color-medium)]">
                  Create, edit, and manage news articles
                </p>
              </div>
            </div>
          </Link>

          {/* Create New Article */}
          <Link
            href="/admin/articles/new"
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">
                  Create New Article
                </h3>
                <p className="text-sm text-blue-100">
                  Write and publish news stories
                </p>
              </div>
            </div>
          </Link>

          {/* User Management (Super Admin Only) */}
          {profile?.is_super_admin && (
            <Link
              href="/admin/users"
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition">
                  <svg className="w-6 h-6 text-purple-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[color:var(--color-dark)] group-hover:text-purple-600 transition">
                    User Management
                  </h3>
                  <p className="text-sm text-[color:var(--color-medium)]">
                    Manage users and permissions
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Site Settings */}
          <Link
            href="/"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-600 transition">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] group-hover:text-gray-600 transition">
                  View Site
                </h3>
                <p className="text-sm text-[color:var(--color-medium)]">
                  See the public-facing website
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
