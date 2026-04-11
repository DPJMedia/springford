"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { BlockEditor, ContentBlock } from "@/components/BlockEditor";
import { SectionSelector } from "@/components/SectionSelector";
import { CategorySelector } from "@/components/CategorySelector";
import { Tooltip } from "@/components/Tooltip";
import { DateTimePicker } from "@/components/DateTimePicker";
import { AuthorSelector } from "@/components/AuthorSelector";
import { TagSelector } from "@/components/TagSelector";
import type { ArticleVisibility } from "@/lib/types/database";
import { ArticleVisibilitySelector } from "@/components/ArticleVisibilitySelector";
import { ArticlePreviewModal } from "@/components/admin/ArticlePreviewModal";
import { useTenant } from "@/lib/tenant/TenantProvider";

export default function NewArticlePage() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([
    { id: "1", type: "text", content: "", order: 0 },
  ]);
  const [sections, setSections] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  // Featured Image
  const [useFeaturedImage, setUseFeaturedImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [imageCredit, setImageCredit] = useState("");
  
  // SEO & Options
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [breakingNewsDuration, setBreakingNewsDuration] = useState(24); // Default 24 hours
  const [allowComments, setAllowComments] = useState(true);
  const [isAdvertisement, setIsAdvertisement] = useState(false);
  const [visibility, setVisibility] = useState<ArticleVisibility>("public");
  const [scheduledFor, setScheduledFor] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [poweredByDiffuse, setPoweredByDiffuse] = useState(false);
  const [coAuthorName, setCoAuthorName] = useState("");
  const [showCoAuthor, setShowCoAuthor] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { id: tenantId } = useTenant();

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_admin, is_super_admin, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      router.push("/");
      return;
    }

    setIsAdmin(true);
    setAuthorName(profile.full_name || "Unknown Author");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    setImageCaption("");
    setImageCredit("");
  }

  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 100);
  }

  async function handleSubmit(action: "draft" | "publish" | "schedule") {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }

    if (contentBlocks.length === 0 || !contentBlocks[0].content?.trim()) {
      setError("Please add some content");
      return;
    }

    if (sections.length === 0) {
      setError("Please select at least one section");
      return;
    }

    if (action === "schedule" && !scheduledFor) {
      setError("Please select a date and time for scheduling");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = null;

      // Upload featured image if provided and toggle is on
      if (useFeaturedImage && imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("article-images")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("article-images").getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      const slug = generateSlug(title);
      const tagsArray = tags && tags.length > 0 ? tags : null;

      let status: "draft" | "published" | "scheduled" = "draft";
      let publishedAt = null;
      let scheduledTime = null;

      if (action === "publish") {
        status = "published";
        publishedAt = new Date().toISOString();
      } else if (action === "schedule") {
        status = "scheduled";
        scheduledTime = new Date(scheduledFor).toISOString();
      }

      // Generate legacy content from blocks for backward compatibility
      const legacyContent = contentBlocks
        .map((block) => {
          if (block.type === "text") {
            return block.content || "";
          } else {
            return `[Image: ${block.caption || "Article image"}]`;
          }
        })
        .join("\n\n");

      const { data, error: insertError } = await supabase
        .from("articles")
        .insert({
          tenant_id: tenantId,
          title,
          slug,
          subtitle: subtitle || null,
          excerpt: excerpt || null,
          content: legacyContent, // Legacy
          content_blocks: contentBlocks, // New
          image_url: imageUrl,
          image_caption: useFeaturedImage ? imageCaption || null : null,
          image_credit: useFeaturedImage ? imageCredit || null : null,
          use_featured_image: useFeaturedImage,
          author_id: user.id,
          author_name: poweredByDiffuse 
            ? (showCoAuthor && coAuthorName ? `Powered by diffuse.ai & ${coAuthorName}` : "Powered by diffuse.ai")
            : (showCoAuthor && coAuthorName ? `${authorName} & ${coAuthorName}` : authorName),
          status,
          published_at: publishedAt,
          scheduled_for: scheduledTime,
          section: sections[0] || "general", // Legacy - use first section
          sections: sections, // New
          category: category || null,
          tags: tagsArray,
          is_featured: isFeatured,
          is_breaking: isBreaking,
          breaking_news_duration: breakingNewsDuration,
          breaking_news_set_at: isBreaking ? new Date().toISOString() : null,
          allow_comments: allowComments,
          is_advertisement: isAdvertisement,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      router.push("/admin/articles");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent" />
          <p className="text-sm text-[var(--admin-text-muted)]">Checking permissions…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminPageHeader
        title="Create New Article"
        actions={
          <>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[var(--admin-accent)] bg-[var(--admin-card-bg)] text-[var(--admin-accent)] text-sm font-semibold hover:bg-[var(--admin-accent)]/10 transition"
              title="See how this article will look to readers before publishing"
            >
              Preview article
            </button>
            <Link
              href="/admin/diffuse"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:opacity-90 transition shadow-sm"
              style={{ fontFamily: 'var(--font-space-grotesk)' }}
            >
              <span><span className="text-white">diffuse</span><span className="text-[#ff9628]">.ai</span></span>
              <span className="text-white">integration</span>
            </Link>
          </>
        }
      />
      <AdminPageLayout>

          {error && (
          <div className="bg-red-950/30 border border-red-800/50 text-red-400 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <form className="space-y-6">
          {/* Basic Info */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              {/* Author Selection */}
              <AuthorSelector value={authorName} onChange={setAuthorName} />

              {/* Powered by diffuse.ai Checkbox */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#ff9628]/5 to-[#c086fa]/5 border border-[#ff9628]/20 rounded-lg">
                <input
                  type="checkbox"
                  id="powered-by-diffuse"
                  checked={poweredByDiffuse}
                  onChange={(e) => {
                    setPoweredByDiffuse(e.target.checked);
                    if (e.target.checked) {
                      setAuthorName("Powered by diffuse.ai");
                    }
                  }}
                  className="w-5 h-5 accent-[#ff9628] border-[var(--admin-border)] rounded focus:ring-[#ff9628] focus:ring-2 cursor-pointer"
                />
                <label 
                  htmlFor="powered-by-diffuse" 
                  className="text-sm font-semibold cursor-pointer select-none text-[var(--admin-text)]"
                  style={{ fontFamily: 'var(--font-space-grotesk)' }}
                >
                  Use &ldquo;Powered by diffuse<span className="text-[#ff9628]">.ai</span>&rdquo; as author
                </label>
              </div>

              {/* Co-Author Section */}
              {!showCoAuthor ? (
                <button
                  type="button"
                  onClick={() => setShowCoAuthor(true)}
                  className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-accent)] hover:opacity-80 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add another author
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-[var(--admin-text)]">
                      Co-Author
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCoAuthor(false);
                        setCoAuthorName("");
                      }}
                      className="text-sm font-semibold text-red-400 hover:text-red-300 transition"
                    >
                      Remove
                    </button>
                  </div>
                  <AuthorSelector value={coAuthorName} onChange={setCoAuthorName} />
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Both authors will be displayed with their profile pictures and an &ldquo;&amp;&rdquo; between their names.
                  </p>
                </div>
              )}

              {/* Is the article an advertisement? */}
              <div className="flex items-center gap-3 p-4 bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] rounded-lg">
                <input
                  type="checkbox"
                  id="is-advertisement"
                  checked={isAdvertisement}
                  onChange={(e) => setIsAdvertisement(e.target.checked)}
                  className="w-5 h-5 accent-[var(--admin-accent)] border-[var(--admin-border)] rounded focus:ring-[var(--admin-accent)] focus:ring-2 cursor-pointer"
                />
                <label htmlFor="is-advertisement" className="text-sm font-medium text-[var(--admin-text)] cursor-pointer">
                  Is the article an advertisement?
                </label>
                <Tooltip text="When checked, a subtle 'Advertisement' label will appear on this article in the feed and on the article page so readers know it's sponsored content." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                  Title *
                  <Tooltip text="The main headline of your article. This is what readers see first and is used for SEO. Keep it clear, concise, and compelling." />
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
                  placeholder="Enter article title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                  Subtitle
                  <Tooltip text="An optional secondary headline that provides additional context. Appears below the main title in a smaller font." />
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
                  placeholder="Optional subtitle"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                  Excerpt *
                  <Tooltip text="A brief summary (2-3 sentences) that appears in article previews and lists. This helps readers decide if they want to read the full article. Also used for SEO meta descriptions if not specified separately." />
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)] focus:border-[var(--admin-accent)]"
                  placeholder="Brief summary of the article"
                  required
                />
              </div>
            </div>
          </div>

          <ArticleVisibilitySelector
            value={visibility}
            onChange={setVisibility}
            disabled={loading}
          />

          {/* Featured Image */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              Featured Image (Cover)
              <Tooltip text="The main image that represents this article. It appears as the article's thumbnail in lists and at the top when viewing the full article. This is separate from images you add within the article content." />
            </h2>
            
            {/* Toggle */}
              <div className="flex items-center gap-3 mb-4 p-4 bg-[var(--admin-table-header-bg)] rounded-lg">
              <label className="text-sm font-semibold text-[var(--admin-text)] flex items-center">
                Use Featured Image:
                <Tooltip text="Toggle YES to add a cover image for this article. Toggle NO if you don't want a cover image. Note: Images added in the article content below will NOT become the cover - only this featured image will." />
              </label>
              <button
                type="button"
                onClick={() => setUseFeaturedImage(!useFeaturedImage)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  useFeaturedImage ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    useFeaturedImage ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-[var(--admin-text-muted)]">
                {useFeaturedImage ? "Yes" : "No"}
              </span>
            </div>

            {useFeaturedImage && (
              <div className="space-y-4">
                {!imagePreview ? (
                  <div>
                    <label className="block w-full border-2 border-dashed border-[var(--admin-border)] rounded-lg p-8 text-center hover:border-[var(--admin-accent)] transition cursor-pointer bg-[var(--admin-table-header-bg)]">
                      <svg
                        className="mx-auto h-12 w-12 text-[var(--admin-text-muted)]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                        Click to upload featured image
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-64 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-lg hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {imagePreview && (
                  <>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
                      placeholder="Image caption (optional)"
                    />
                    <input
                      type="text"
                      value={imageCredit}
                      onChange={(e) => setImageCredit(e.target.value)}
                      className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
                      placeholder="Photo credit (optional)"
                    />
                  </>
                )}
              </div>
            )}

            {!useFeaturedImage && (
              <p className="text-sm text-[var(--admin-text-muted)] italic">
                No featured image will be displayed. You can still add images within the article content below.
              </p>
            )}
          </div>

          {/* Content Blocks */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              Article Content
              <Tooltip text="Build your article using modular blocks. Start with the first text block, then use the buttons below to add more text blocks or images in any order. Each block can be reordered or removed. Images you add here appear within the article content, not as the cover image." />
            </h2>
            <BlockEditor blocks={contentBlocks} onChange={setContentBlocks} />
          </div>

          {/* Sections */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Sections *</h2>
            <SectionSelector selectedSections={sections} onChange={setSections} />
          </div>

          {/* Category & Tags */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Category & Tags</h2>
            <div className="space-y-4">
              <CategorySelector value={category} onChange={setCategory} />

              <div>
                <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                  Tags
                  <Tooltip text="Keywords related to your article. Tags help readers find related content and improve SEO. You can use existing tags or create new ones." />
                </label>
                <TagSelector selectedTags={tags} onChange={setTags} />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Article Options</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-5 h-5 accent-[var(--admin-accent)]"
                />
                <span className="text-sm font-medium flex items-center">
                  Featured Article (Top Stories)
                  <Tooltip text="Check this to mark the article as 'featured'. Featured articles appear in the 'Top Stories' section on the homepage, giving them prominent placement. Use this for your most important stories of the day." />
                </span>
              </label>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isBreaking}
                    onChange={(e) => setIsBreaking(e.target.checked)}
                    className="w-5 h-5 accent-[var(--admin-accent)]"
                  />
                  <span className="text-sm font-medium flex items-center">
                    Breaking News
                    <Tooltip text="Check this for urgent, time-sensitive news that's currently developing. Breaking news articles display a special 'BREAKING' badge and are prioritized at the top of news feeds. Use sparingly for truly urgent stories." />
                  </span>
                </label>

                {isBreaking && (
                  <div className="ml-8 p-4 bg-red-950/20 rounded-lg border border-red-800/40">
                    <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                      Breaking News Duration (hours)
                      <Tooltip text="How many hours this article should remain as breaking news. After this duration, it will automatically stop showing in the breaking news banner. Default is 24 hours." />
                    </label>
                    <input
                      type="number"
                      value={breakingNewsDuration}
                      onChange={(e) => setBreakingNewsDuration(Math.max(1, parseInt(e.target.value) || 24))}
                      min="1"
                      max="168"
                      className="w-32 border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                      Breaking news will expire after {breakingNewsDuration} hour{breakingNewsDuration !== 1 ? 's' : ''} and automatically stop displaying in the banner.
                    </p>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* SEO */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              SEO Settings
              <Tooltip text="Search Engine Optimization settings control how your article appears in Google search results and when shared on social media. These settings help improve visibility and click-through rates." />
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                  Meta Title (for Google)
                  <Tooltip text="The title that appears in Google search results and browser tabs. If left blank, your article title will be used. Keep under 60 characters for best results. Make it compelling to improve click-through rates." />
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={60}
                  className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
                  placeholder="Leave blank to use article title"
                />
                <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                  {metaTitle.length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--admin-text)] mb-2 flex items-center">
                  Meta Description (for Google)
                  <Tooltip text="The description that appears under your title in Google search results and when shared on Facebook/Twitter. If left blank, your excerpt will be used. Keep under 160 characters. This is crucial for SEO and social sharing." />
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-[var(--admin-text)] rounded-md px-4 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--admin-accent)]"
                  placeholder="Leave blank to use excerpt"
                />
                <p className="text-xs text-[var(--admin-text-muted)] mt-1">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              Publishing
              <Tooltip text="Control when your article goes live. You can publish immediately, save as a draft to work on later, or schedule it to publish automatically at a future date and time." />
            </h2>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-semibold text-[var(--admin-text)] flex items-center">
                    Schedule For (optional)
                    <Tooltip text="Set a specific date and time (Eastern Time) for this article to be automatically published. Leave empty to publish immediately or save as draft. Useful for planning content releases in advance." />
                  </label>
                </div>
                <DateTimePicker
                  value={scheduledFor}
                  onChange={setScheduledFor}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleSubmit("draft")}
                  disabled={loading}
                  className="px-6 py-3 bg-[var(--admin-table-header-bg)] border border-[var(--admin-border)] text-[var(--admin-text)] rounded-lg hover:bg-[var(--admin-table-row-hover)] disabled:opacity-50 font-semibold flex items-center gap-2"
                  title="Save article as draft - not visible to public"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit("schedule")}
                  disabled={loading || !scheduledFor}
                  className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 font-semibold flex items-center gap-2"
                  title="Schedule article to publish at the date/time specified above"
                >
                  Schedule
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 border-2 border-[var(--admin-accent)] bg-[var(--admin-card-bg)] text-[var(--admin-accent)] hover:bg-[var(--admin-accent)]/10"
                  title="See how this article will look to readers before publishing"
                >
                  Preview article
                </button>

                <button
                  type="button"
                  onClick={() => handleSubmit("publish")}
                  disabled={loading}
                  className="px-6 py-3 bg-[var(--admin-accent)] text-black rounded-lg hover:opacity-90 disabled:opacity-50 font-semibold flex items-center gap-2"
                  title="Publish article immediately - visible to public now"
                >
                  {loading ? "Publishing..." : "Publish Now"}
                </button>
              </div>

              <div className="pt-2 space-y-1 text-xs text-[var(--admin-text-muted)] border-t border-[var(--admin-border)]">
                <p>• <strong>Save as Draft:</strong> Article saved but NOT visible to public. You can continue editing later.</p>
                <p>• <strong>Schedule:</strong> Article will auto-publish at the date/time you set above.</p>
                <p>• <strong>Publish Now:</strong> Article goes live immediately and is visible to all readers.</p>
              </div>
            </div>
          </div>
        </form>
      </AdminPageLayout>

      <ArticlePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={title}
        subtitle={subtitle}
        excerpt={excerpt}
        contentBlocks={contentBlocks}
        legacyContent=""
        imageUrl={useFeaturedImage ? imagePreview : null}
        imageCaption={imageCaption}
        imageCredit={imageCredit}
        authorName={authorName}
      />
    </>
  );
}
