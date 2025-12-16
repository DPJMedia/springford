"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ScheduleDisplay } from "@/components/ScheduleDisplay";
import { ScheduledPublisher } from "@/components/ScheduledPublisher";

interface Article {
  id: string;
  title: string;
  section: string;
  status: string;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  author_name: string | null;
  view_count: number;
}

export default function ArticlesManagementPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndFetchArticles();
    
    // Set up auto-refresh every 30 seconds to check for scheduled articles
    const refreshInterval = setInterval(() => {
      if (isAdmin) {
        fetchArticles();
      }
    }, 30000); // 30 seconds
    
    // Update current time every second for real-time status updates
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(timeInterval);
    };
  }, [filter, isAdmin]);

  async function checkAdminAndFetchArticles() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, is_super_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      router.push("/");
      return;
    }

    setIsAdmin(true);
    await fetchArticles();
  }

  async function fetchArticles() {
    setLoading(true);
    
    // First, auto-publish any scheduled articles whose time has arrived
    try {
      const { data: publishResult } = await supabase.rpc('auto_publish_scheduled_articles');
      if (publishResult && publishResult > 0) {
        console.log(`Auto-published ${publishResult} scheduled article(s)`);
      }
    } catch (error) {
      console.error("Error auto-publishing:", error);
    }
    
    // Then fetch all articles
    let query = supabase
      .from("articles")
      .select("id, title, section, status, published_at, scheduled_for, created_at, author_name, view_count")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching articles:", error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  }

  async function deleteArticle(id: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;

    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      alert("Error deleting article: " + error.message);
    } else {
      setArticles(articles.filter((a) => a.id !== id));
    }
  }

  function getStatusDisplay(article: Article) {
    if (article.status === "scheduled" && article.scheduled_for) {
      const now = new Date();
      const scheduled = new Date(article.scheduled_for);
      if (scheduled <= now) {
        return {
          text: "Publishing now...",
          color: "bg-blue-100 text-blue-800 animate-pulse"
        };
      }
    }
    
    const statusColors: Record<string, string> = {
      published: "bg-green-100 text-green-800",
      scheduled: "bg-orange-100 text-orange-800",
      draft: "bg-gray-100 text-gray-800"
    };
    
    return {
      text: article.status,
      color: statusColors[article.status] || "bg-gray-100 text-gray-800"
    };
  }

  if (!isAdmin) {
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
      <ScheduledPublisher />
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[color:var(--color-dark)]">Article Management</h1>
            <p className="text-sm text-[color:var(--color-medium)] mt-1">Create, edit, and manage news articles</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin"
              className="px-4 py-2 text-sm font-semibold text-[color:var(--color-dark)] hover:bg-gray-100 rounded-md transition"
            >
              ← Back to Dashboard
            </Link>
            <Link
              href="/admin/articles/new"
              className="px-4 py-2 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white hover:bg-[#2b7a92] rounded-md transition"
            >
              + New Article
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg p-4 shadow-sm">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                filter === "all"
                  ? "bg-[color:var(--color-riviera-blue)] text-white"
                  : "bg-gray-100 text-[color:var(--color-dark)] hover:bg-gray-200"
              }`}
            >
              All ({articles.length})
            </button>
            <button
              onClick={() => setFilter("published")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                filter === "published"
                  ? "bg-[color:var(--color-riviera-blue)] text-white"
                  : "bg-gray-100 text-[color:var(--color-dark)] hover:bg-gray-200"
              }`}
            >
              Published
            </button>
            <button
              onClick={() => setFilter("draft")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                filter === "draft"
                  ? "bg-[color:var(--color-riviera-blue)] text-white"
                  : "bg-gray-100 text-[color:var(--color-dark)] hover:bg-gray-200"
              }`}
            >
              Drafts
            </button>
            <button
              onClick={() => setFilter("scheduled")}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition ${
                filter === "scheduled"
                  ? "bg-[color:var(--color-riviera-blue)] text-white"
                  : "bg-gray-100 text-[color:var(--color-dark)] hover:bg-gray-200"
              }`}
            >
              Scheduled
            </button>
          </div>
        </div>

        {/* Articles Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-[color:var(--color-medium)]">No articles found</p>
            <Link
              href="/admin/articles/new"
              className="mt-4 inline-block px-4 py-2 text-sm font-semibold bg-[color:var(--color-riviera-blue)] text-white hover:bg-[#2b7a92] rounded-md transition"
            >
              Create your first article
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Section
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[color:var(--color-dark)] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-[color:var(--color-dark)]">{article.title}</div>
                        <ScheduleDisplay 
                          scheduledFor={article.scheduled_for || ""} 
                          status={article.status}
                          onPublishTime={() => {
                            // Refresh articles when publish time arrives
                            setTimeout(() => fetchArticles(), 2000); // Wait 2 seconds then refresh
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 capitalize">
                        {article.section}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const statusDisplay = getStatusDisplay(article);
                        return (
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${statusDisplay.color}`}
                          >
                            {statusDisplay.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-medium)]">
                      {article.author_name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-medium)]">
                      {article.view_count}
                    </td>
                    <td className="px-6 py-4 text-sm text-[color:var(--color-medium)]">
                      {new Date(article.published_at || article.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <Link
                        href={`/admin/articles/edit/${article.id}`}
                        className="text-[color:var(--color-riviera-blue)] hover:underline mr-4"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteArticle(article.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

