"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScheduleDisplay } from "@/components/ScheduleDisplay";
import { ScheduledPublisher } from "@/components/ScheduledPublisher";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";

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
  share_count: number;
  image_url?: string | null;
  visibility?: string | null;
}

type SortOption =
  | "date-newest"
  | "date-oldest"
  | "title-az"
  | "title-za"
  | "views-high"
  | "views-low";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-newest", label: "Date (newest)" },
  { value: "date-oldest", label: "Date (oldest)" },
  { value: "title-az", label: "Title (A–Z)" },
  { value: "title-za", label: "Title (Z–A)" },
  { value: "views-high", label: "Most views (all time)" },
  { value: "views-low", label: "Least views (all time)" },
];

const navItemActive = "bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]";
const navItemInactive =
  "text-[var(--admin-text)] hover:bg-[var(--admin-card-bg)]";

export default function ArticlesManagementPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editorsPicks, setEditorsPicks] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-newest");
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();
  const supabase = createClient();

  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    setIsAdmin(true);
    fetchArticles();
    fetchEditorsPicks();

    // Set up auto-refresh every 30 seconds to check for scheduled articles
    const refreshInterval = setInterval(() => {
      fetchArticles();
    }, 30000); // 30 seconds
    
    // Update current time every second for real-time status updates
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(refreshInterval);
      clearInterval(timeInterval);
    };
  }, []);

  async function fetchEditorsPicks() {
    const { data } = await supabase
      .from("editors_picks")
      .select("article_id, position")
      .order("position", { ascending: true });
    
    if (data && data.length > 0) {
      const picks: string[] = ["", "", ""];
      data.forEach((row: { article_id: string; position: number }) => {
        picks[row.position - 1] = row.article_id;
      });
      setEditorsPicks(picks);
    }
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

    // Always fetch all articles so tab counts are accurate; we filter for display in the UI
    const { data, error } = await supabase
      .from("articles")
      .select("id, title, section, status, published_at, scheduled_for, created_at, author_name, view_count, share_count, visibility")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching articles:", error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  }

  // Tab counts: derived from full list so "All" = published + scheduled + draft (what the page shows)
  const allCount = articles.filter((a) => a.status !== "archived").length;
  const publishedCount = articles.filter((a) => a.status === "published").length;
  const draftCount = articles.filter((a) => a.status === "draft").length;
  const scheduledCount = articles.filter((a) => a.status === "scheduled").length;
  const archivedCount = articles.filter((a) => a.status === "archived").length;

  // Tab-filtered list (same logic as table)
  const tabFiltered = articles.filter((article) => {
    if (filter === "all") return article.status !== "archived";
    if (filter === "archived") return article.status === "archived";
    return article.status === filter;
  });

  const searchLower = searchQuery.trim().toLowerCase();
  const searchFiltered =
    !searchLower
      ? tabFiltered
      : tabFiltered.filter(
          (a) =>
            a.title?.toLowerCase().includes(searchLower) ||
            (a.author_name ?? "").toLowerCase().includes(searchLower)
        );

  const sortedList = [...searchFiltered].sort((a, b) => {
    switch (sortBy) {
      case "date-newest":
        return (
          new Date(b.published_at || b.created_at).getTime() -
          new Date(a.published_at || a.created_at).getTime()
        );
      case "date-oldest":
        return (
          new Date(a.published_at || a.created_at).getTime() -
          new Date(b.published_at || b.created_at).getTime()
        );
      case "title-az":
        return (a.title ?? "").localeCompare(b.title ?? "");
      case "title-za":
        return (b.title ?? "").localeCompare(a.title ?? "");
      case "views-high": {
        const vb = a.view_count ?? 0;
        const va = b.view_count ?? 0;
        if (va !== vb) return va - vb;
        return (a.title ?? "").localeCompare(b.title ?? "");
      }
      case "views-low": {
        const vb = a.view_count ?? 0;
        const va = b.view_count ?? 0;
        if (vb !== va) return vb - va;
        return (a.title ?? "").localeCompare(b.title ?? "");
      }
      default:
        return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedList.length / ROWS_PER_PAGE));
  const paginatedList = sortedList.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Reset to page 1 when tab, search, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy]);

  async function deleteArticle(id: string) {
    if (!confirm("Are you sure you want to delete this article?")) return;

    const { error } = await supabase.from("articles").delete().eq("id", id);

    if (error) {
      alert("Error deleting article: " + error.message);
    } else {
      setArticles(articles.filter((a) => a.id !== id));
    }
  }

  async function archiveArticle(id: string) {
    if (!confirm("Are you sure you want to archive this article? It will no longer appear on the site.")) return;

    const { error } = await supabase
      .from("articles")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      alert("Error archiving article: " + error.message);
    } else {
      // Update the local state
      setArticles(articles.map((a) => (a.id === id ? { ...a, status: "archived" } : a)));
      alert("Article archived successfully!");
    }
  }

  async function republishArticle(id: string) {
    if (!confirm("Are you sure you want to republish this article?")) return;

    const { error } = await supabase
      .from("articles")
      .update({ 
        status: "published",
        published_at: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      alert("Error republishing article: " + error.message);
    } else {
      // Update the local state
      setArticles(articles.map((a) => (a.id === id ? { ...a, status: "published", published_at: new Date().toISOString() } : a)));
      alert("Article republished successfully!");
    }
  }

  function audienceLabel(visibility: string | null | undefined) {
    const v = visibility ?? "public";
    if (v === "newsletter_subscribers") return { text: "Subscribers", color: "bg-sky-100 text-sky-900" };
    if (v === "admin_only") return { text: "Admin only", color: "bg-orange-100 text-orange-900" };
    return { text: "Public", color: "bg-gray-100 text-gray-800" };
  }

  function getStatusDisplay(article: Article) {
    if (article.status === "scheduled" && article.scheduled_for) {
      const now = new Date();
      const scheduled = new Date(article.scheduled_for);
      if (scheduled <= now) {
        return {
          text: "Publishing now...",
          color: "bg-orange-100 text-orange-800 animate-pulse"
        };
      }
    }
    
    const statusColors: Record<string, string> = {
      published: "bg-green-100 text-green-800",
      scheduled: "bg-orange-100 text-orange-800",
      draft: "bg-gray-100 text-gray-800",
      archived: "bg-red-100 text-red-800"
    };
    
    return {
      text: article.status,
      color: statusColors[article.status] || "bg-gray-100 text-gray-800"
    };
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent" />
          <p className="mt-4 text-sm text-[var(--admin-text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  const filterRowBtn = (key: string, label: string, count: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      className={`w-full flex items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
        filter === key ? navItemActive : navItemInactive
      }`}
    >
      {label} ({count})
    </button>
  );

  const sortRowBtn = (value: SortOption, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setSortBy(value)}
      className={`w-full flex items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-all ${
        sortBy === value ? navItemActive : navItemInactive
      }`}
    >
      {label}
    </button>
  );

  const actionsPanel = (
    <AdminActionsPanel
      attachBelowCreateButton
      sections={[
        {
          title: "Filter",
          customContent: (
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                {filterRowBtn("all", "All", allCount)}
                {filterRowBtn("published", "Published", publishedCount)}
                {filterRowBtn("draft", "Drafts", draftCount)}
                {filterRowBtn("scheduled", "Scheduled", scheduledCount)}
                {filterRowBtn("archived", "Archived", archivedCount)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
                  Sort
                </p>
                <div className="flex flex-col gap-1.5" role="group" aria-label="Sort articles">
                  {SORT_OPTIONS.map(({ value, label }) => sortRowBtn(value, label))}
                </div>
              </div>
            </div>
          ),
        },
        {
          title: "Actions",
          customContent: (
            <div className="space-y-1">
              <Link
                href="/"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 transition-all ${navItemInactive}`}
              >
                <span className="h-4 w-4 shrink-0 text-[var(--admin-text-muted)]" aria-hidden>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3"
                    />
                  </svg>
                </span>
                <span className="text-sm font-medium">Back to site</span>
              </Link>
            </div>
          ),
        },
      ]}
    />
  );

  return (
    <>
      <ScheduledPublisher />
      
      <AdminPageHeader title="Articles" />

      <AdminPageLayout
        createButton={{
          label: "Create Article",
          href: "/admin/articles/new",
        }}
        actionsPanel={actionsPanel}
      >

      {!loading && (
        <>
          <div className="mb-4 xl:hidden space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">Filter</p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {[
                ["all", "All", allCount],
                ["published", "Published", publishedCount],
                ["draft", "Drafts", draftCount],
                ["scheduled", "Scheduled", scheduledCount],
                ["archived", "Archived", archivedCount],
              ].map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key as string)}
                  className={`shrink-0 flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                    filter === key ? navItemActive : navItemInactive
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
                Sort
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Sort articles">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSortBy(value)}
                    className={`rounded-lg px-3 py-2 text-left text-xs font-medium transition-all sm:text-sm ${
                      sortBy === value ? navItemActive : navItemInactive
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mb-4">
            <label htmlFor="articles-search" className="sr-only">
              Search articles
            </label>
            <input
              id="articles-search"
              type="search"
              placeholder="Search by title or author…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-4 py-2.5 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
            />
          </div>
        </>
      )}

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent"></div>
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-[var(--admin-card-bg)] rounded-lg p-12 text-center border border-[var(--admin-border)]">
            <p className="text-[var(--admin-text-muted)]">No articles found</p>
            <Link
              href="/admin/articles/new"
              className="mt-4 inline-block px-4 py-2 text-sm font-semibold bg-[var(--admin-accent)] text-white hover:bg-[var(--admin-accent-hover)] rounded-md transition"
            >
              Create your first article
            </Link>
          </div>
        ) : (
          <>
          <div className="bg-[var(--admin-card-bg)] rounded-lg shadow-sm overflow-hidden border border-[var(--admin-border)]">
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--admin-table-header-bg)] border-b border-[var(--admin-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--admin-text)] uppercase tracking-wider" style={{width: '40%'}}>
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--admin-text)] uppercase tracking-wider" style={{width: '20%'}}>
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--admin-text)] uppercase tracking-wider" style={{width: '20%'}}>
                    Views
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--admin-text)] uppercase tracking-wider" style={{width: '20%'}}>
                    Shares
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {sortedList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                      No articles match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((article) => (
                  <tr key={article.id} className="hover:bg-[var(--admin-table-row-hover)] transition">
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--admin-text)]">{article.title}</div>
                        <div className="text-xs text-[var(--admin-text-muted)]">
                          {new Date(article.published_at || article.created_at).toLocaleDateString()}
                        </div>
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
                    <td className="px-6 py-4 text-sm text-[var(--admin-text)]">
                      {article.author_name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--admin-text)]">
                      {article.view_count.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--admin-text)]">
                      {(article.share_count || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
            </div>
            {sortedList.length > 0 && totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--admin-border)] px-6 py-4 bg-[var(--admin-table-header-bg)]">
                <p className="text-sm text-[color:var(--color-medium)]">
                  Page {currentPage} of {totalPages}
                  <span className="ml-2 text-gray-400">
                    ({sortedList.length} article{sortedList.length !== 1 ? "s" : ""})
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--admin-card-bg)] transition"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[2.25rem] px-2 py-1.5 text-sm font-medium rounded-md border transition ${
                          currentPage === page
                            ? "border-[var(--admin-accent)] bg-[var(--admin-accent)] text-white"
                            : "border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)]"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm font-medium rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] hover:bg-[var(--admin-table-row-hover)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--admin-card-bg)] transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {filter === "all" && (
            <div className="mt-8 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">
                  Editors&apos; Picks
                </h2>
                <div className="bg-[var(--admin-card-bg)] rounded-lg p-6 border border-[var(--admin-border)] min-w-0 overflow-hidden">
                  <div className="space-y-3 min-w-0">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-semibold text-[var(--admin-text-muted)] w-8 shrink-0">#{index + 1}</span>
                        <select
                          value={editorsPicks[index] || ""}
                          onChange={(e) => {
                            const newPicks = [...editorsPicks];
                            newPicks[index] = e.target.value;
                            setEditorsPicks(newPicks);
                          }}
                          className="min-w-0 flex-1 max-w-full border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-[var(--admin-text)] rounded-md pl-3 pr-10 py-2 text-sm"
                        >
                          <option value="">Select an article...</option>
                          {articles
                            .filter((a) => a.status === "published")
                            .map((article) => (
                              <option key={article.id} value={article.id}>
                                {article.title}
                              </option>
                            ))}
                        </select>
                        {editorsPicks[index] && (
                          <button
                            type="button"
                            onClick={() => {
                              const newPicks = [...editorsPicks];
                              newPicks[index] = "";
                              setEditorsPicks(newPicks);
                            }}
                            className="shrink-0 px-3 py-2 text-sm text-red-600 border border-[var(--admin-border)] bg-[var(--admin-card-bg)] rounded-md hover:bg-[var(--admin-table-row-hover)] transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const filteredPicks = editorsPicks.filter(Boolean);
                      try {
                        await supabase.from("editors_picks").delete().in("position", [1, 2, 3]);
                        for (let i = 0; i < filteredPicks.length; i++) {
                          await supabase.from("editors_picks").insert({
                            article_id: filteredPicks[i],
                            position: i + 1,
                          });
                        }
                        alert(`Editor's Picks saved successfully! (${filteredPicks.length} articles selected)`);
                      } catch (err) {
                        console.error(err);
                        alert("Failed to save Editor's Picks. Please try again.");
                      }
                    }}
                    className="mt-4 px-6 py-2 bg-[var(--admin-accent)] text-white rounded-md font-semibold hover:bg-opacity-90 transition"
                  >
                    Save Editor&apos;s Picks
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
        )}
      </AdminPageLayout>
    </>
  );
}

