"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
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

export default function ArticlesManagementPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [isAdmin, setIsAdmin] = useState(false);
  const [editorsPicks, setEditorsPicks] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-newest");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
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

  const sectionOptions = useMemo(() => {
    const s = new Set<string>();
    for (const a of articles) {
      const sec = typeof a.section === "string" ? a.section.trim() : "";
      if (sec) s.add(sec);
    }
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [articles]);

  // Tab-filtered list (same logic as table)
  const tabFiltered = articles.filter((article) => {
    if (filter === "all") return article.status !== "archived";
    if (filter === "archived") return article.status === "archived";
    return article.status === filter;
  });

  const sectionFiltered =
    sectionFilter === "all"
      ? tabFiltered
      : tabFiltered.filter((a) => (a.section ?? "").trim() === sectionFilter);

  const searchLower = searchQuery.trim().toLowerCase();
  const searchFiltered =
    !searchLower
      ? sectionFiltered
      : sectionFiltered.filter(
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

  // Reset to page 1 when tab, search, sort, or section filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, sortBy, sectionFilter]);

  useEffect(() => {
    setSelectedArticleId(null);
  }, [filter, sectionFilter, sortBy]);

  async function bulkArchive(ids: string[]) {
    if (ids.length === 0) return;
    if (
      !confirm(
        `Archive ${ids.length} article${ids.length !== 1 ? "s" : ""}? They will no longer appear on the site.`,
      )
    )
      return;

    const { error } = await supabase.from("articles").update({ status: "archived" }).in("id", ids);

    if (error) {
      alert("Error archiving articles: " + error.message);
    } else {
      setArticles((prev) =>
        prev.map((a) => (ids.includes(a.id) ? { ...a, status: "archived" } : a)),
      );
      setSelectedArticleId(null);
      alert(`Archived ${ids.length} article${ids.length !== 1 ? "s" : ""}.`);
    }
  }

  async function bulkDelete(ids: string[]) {
    if (ids.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${ids.length} article${ids.length !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;

    const { error } = await supabase.from("articles").delete().in("id", ids);

    if (error) {
      alert("Error deleting articles: " + error.message);
    } else {
      setArticles((prev) => prev.filter((a) => !ids.includes(a.id)));
      setSelectedArticleId(null);
      void fetchEditorsPicks();
    }
  }

  /** Uppercase status beside the date (same line, muted gray). */
  function getStatusLineText(article: Article): string {
    if (article.status === "scheduled" && article.scheduled_for) {
      const scheduled = new Date(article.scheduled_for);
      if (scheduled <= currentTime) {
        return "PUBLISHING NOW";
      }
    }
    return (article.status || "draft").toUpperCase();
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

  const selectedArticle = selectedArticleId
    ? articles.find((a) => a.id === selectedArticleId) ?? null
    : null;

  const selectClass =
    "w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 py-2 text-sm text-[var(--admin-text)] focus:border-[var(--admin-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]";

  const filterDropdowns = (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="articles-status-desktop"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]"
        >
          Status
        </label>
        <select
          id="articles-status-desktop"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter articles by status"
        >
          <option value="all">All ({allCount})</option>
          <option value="published">Published ({publishedCount})</option>
          <option value="draft">Drafts ({draftCount})</option>
          <option value="scheduled">Scheduled ({scheduledCount})</option>
          <option value="archived">Archived ({archivedCount})</option>
        </select>
      </div>
      <div>
        <label
          htmlFor="articles-sort-desktop"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]"
        >
          Sort
        </label>
        <select
          id="articles-sort-desktop"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className={selectClass}
          aria-label="Sort articles"
        >
          {SORT_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          htmlFor="articles-section-filter-desktop"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]"
        >
          Filter
        </label>
        <select
          id="articles-section-filter-desktop"
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className={selectClass}
          aria-label="Filter articles by section"
        >
          <option value="all">All sections</option>
          {sectionOptions.map((sec) => (
            <option key={sec} value={sec}>
              {sec}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  const actionsPanel = (
    <AdminActionsPanel
      attachBelowCreateButton
      sections={[
        {
          title: "",
          customContent: filterDropdowns,
        },
        ...(selectedArticle
          ? [
              {
                title: "Article",
                items: [
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                      </svg>
                    ),
                    label: "Edit",
                    href: `/admin/articles/edit/${selectedArticle.id}`,
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
                        />
                      </svg>
                    ),
                    label: "Archive",
                    onClick: () => void bulkArchive([selectedArticle.id]),
                  },
                  {
                    icon: (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    ),
                    label: "Delete",
                    variant: "danger" as const,
                    onClick: () => void bulkDelete([selectedArticle.id]),
                  },
                ],
              },
            ]
          : [
              {
                title: "Article",
                customContent: (
                  <p className="text-sm text-[var(--admin-text-muted)] px-1">
                    Select an article in the table to edit, archive, or delete.
                  </p>
                ),
              },
            ]),
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
            <div>
              <label
                htmlFor="articles-status-mobile"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]"
              >
                Status
              </label>
              <select
                id="articles-status-mobile"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter articles by status"
              >
                <option value="all">All ({allCount})</option>
                <option value="published">Published ({publishedCount})</option>
                <option value="draft">Drafts ({draftCount})</option>
                <option value="scheduled">Scheduled ({scheduledCount})</option>
                <option value="archived">Archived ({archivedCount})</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="articles-sort-mobile"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]"
              >
                Sort
              </label>
              <select
                id="articles-sort-mobile"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className={selectClass}
                aria-label="Sort articles"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="articles-section-filter-mobile"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]"
              >
                Filter
              </label>
              <select
                id="articles-section-filter-mobile"
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className={selectClass}
                aria-label="Filter articles by section"
              >
                <option value="all">All sections</option>
                {sectionOptions.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
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
                  <tr
                    key={article.id}
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      setSelectedArticleId((prev) => (prev === article.id ? null : article.id))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedArticleId((prev) => (prev === article.id ? null : article.id));
                      }
                    }}
                    className={`cursor-pointer transition ${
                      selectedArticleId === article.id
                        ? "bg-[var(--admin-accent)]/10"
                        : "hover:bg-[var(--admin-table-row-hover)]"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-[var(--admin-text)]">{article.title}</div>
                        <div className="text-xs text-[var(--admin-text-muted)]">
                          <span>{new Date(article.published_at || article.created_at).toLocaleDateString()}</span>
                          <span className="mx-1.5" aria-hidden>
                            ·
                          </span>
                          <span className="uppercase">{getStatusLineText(article)}</span>
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

