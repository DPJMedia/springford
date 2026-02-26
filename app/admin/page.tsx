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
  currentViews: number;  // Views from currently published articles
  allTimeViews: number;  // Views from all articles ever
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalArticles: 0,
    publishedArticles: 0,
    draftArticles: 0,
    scheduledArticles: 0,
    currentViews: 0,
    allTimeViews: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasDiffuseConnection, setHasDiffuseConnection] = useState(false);
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
    checkDiffuseConnection(user.id);
  }

  async function checkDiffuseConnection(userId: string) {
    // Check if user has a DiffuseAI connection
    const { data: connection } = await supabase
      .from("diffuse_connections")
      .select("id")
      .eq("springford_user_id", userId)
      .maybeSingle();

    setHasDiffuseConnection(!!connection);
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
      
      // Current Views: Only from currently published articles
      const currentViews = articles
        .filter((a) => a.status === "published")
        .reduce((sum, a) => sum + (a.view_count || 0), 0);
      
      // All Time Views: From all articles (published, draft, archived, etc.)
      const allTimeViews = articles.reduce((sum, a) => sum + (a.view_count || 0), 0);

      setStats({
        totalArticles,
        publishedArticles,
        draftArticles,
        scheduledArticles,
        currentViews,
        allTimeViews,
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
        <div className="mb-8 max-w-6xl mx-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8 max-w-6xl mx-auto">
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
            <div className="text-3xl font-black text-blue-600 mb-2">
              {stats.currentViews.toLocaleString()}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              Current Views
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="text-3xl font-black text-purple-600 mb-2">
              {stats.allTimeViews.toLocaleString()}
            </div>
            <div className="text-sm font-semibold text-[color:var(--color-medium)]">
              All Time Views
            </div>
          </div>
        </div>

        {/* Quick Actions - same width as stats above */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
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

          {/* User Management (Super Admin Only) */}
          {profile?.is_super_admin && (
            <>
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

              {/* Ad Manager (Super Admin Only) */}
              <Link
                href="/admin/ads"
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-600 transition">
                    <svg className="w-6 h-6 text-orange-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[color:var(--color-dark)] group-hover:text-orange-600 transition">
                      Ad Manager
                    </h3>
                    <p className="text-sm text-[color:var(--color-medium)]">
                      Manage advertisements and ad slots
                    </p>
                  </div>
                </div>
              </Link>
            </>
          )}

          {/* Analytics Dashboard (All Admins) */}
          <Link
            href="/admin/analytics"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-600 transition">
                <svg className="w-6 h-6 text-emerald-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] group-hover:text-emerald-600 transition">
                  Analytics Dashboard
                </h3>
                <p className="text-sm text-[color:var(--color-medium)]">
                  Comprehensive site metrics and performance
                </p>
              </div>
            </div>
          </Link>

          {/* Edit Profile (All Admins) */}
          <Link
            href="/profile"
            className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition">
                <svg className="w-6 h-6 text-indigo-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] group-hover:text-indigo-600 transition">
                  Edit Profile
                </h3>
                <p className="text-sm text-[color:var(--color-medium)]">
                  Update your account information
                </p>
              </div>
            </div>
          </Link>

          {/* DiffuseAI Integration (All Admins) */}
          <Link
            href="/admin/diffuse"
            className="relative overflow-hidden bg-[#000000] rounded-xl p-6 shadow-[0_10px_15px_-3px_rgba(255,150,40,0.3)] hover:shadow-[0_20px_25px_-5px_rgba(255,150,40,0.4)] transition-all duration-300 group col-span-1 md:col-span-2 border border-white/10"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#ff9628]/10 via-transparent to-[#c086fa]/10 opacity-50"></div>
            <div className="relative flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-r from-[#ff9628] to-[#ff7300] rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-1 tracking-tight">
                  diffuse<span className="text-[#ff9628]">.ai</span> integration
                </h3>
                <p className="text-sm text-[#dbdbdb]">
                  Import AI-generated articles from DiffuseAI
                </p>
              </div>
              <div className="hidden md:block">
                <div className="px-4 py-2 bg-gradient-to-r from-[#ff9628] to-[#ff7300] rounded-lg text-white text-sm font-semibold group-hover:scale-105 transition-transform">
                  {hasDiffuseConnection ? 'Open' : 'Connect Diffuse Account'}
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
