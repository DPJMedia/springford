"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Article } from "@/lib/types/database";
import { BlockEditor, ContentBlock } from "@/components/BlockEditor";
import { SectionSelector } from "@/components/SectionSelector";
import { Tooltip } from "@/components/Tooltip";
import { DateTimePicker } from "@/components/DateTimePicker";

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  
  // Featured Image
  const [useFeaturedImage, setUseFeaturedImage] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [imageCredit, setImageCredit] = useState("");
  
  // SEO & Options
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [breakingNewsDuration, setBreakingNewsDuration] = useState(24);
  const [allowComments, setAllowComments] = useState(true);
  const [scheduledFor, setScheduledFor] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAdminAndLoad();
  }, [id]);

  async function checkAdminAndLoad() {
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
    await loadArticle();
  }

  async function loadArticle() {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Article not found");

      setArticle(data);
      setTitle(data.title);
      setSubtitle(data.subtitle || "");
      setExcerpt(data.excerpt || "");
      
      // Load content blocks (with fallback to legacy content)
      if (data.content_blocks && Array.isArray(data.content_blocks) && data.content_blocks.length > 0) {
        setContentBlocks(data.content_blocks);
      } else if (data.content) {
        // Convert legacy content to a single text block
        setContentBlocks([
          { id: "1", type: "text", content: data.content, order: 0 }
        ]);
      } else {
        setContentBlocks([{ id: "1", type: "text", content: "", order: 0 }]);
      }

      // Load sections (with fallback to legacy section)
      if (data.sections && Array.isArray(data.sections) && data.sections.length > 0) {
        setSections(data.sections);
      } else if (data.section) {
        setSections([data.section]);
      }

      setCategory(data.category || "");
      setTags(data.tags ? data.tags.join(", ") : "");
      
      setUseFeaturedImage(data.use_featured_image ?? (!!data.image_url));
      setCurrentImageUrl(data.image_url || null);
      setImageCaption(data.image_caption || "");
      setImageCredit(data.image_credit || "");
      
      setMetaTitle(data.meta_title || "");
      setMetaDescription(data.meta_description || "");
      setIsFeatured(data.is_featured);
      setIsBreaking(data.is_breaking);
      setBreakingNewsDuration(data.breaking_news_duration || 24);
      setAllowComments(data.allow_comments);
      
      if (data.scheduled_for) {
        const schedDate = new Date(data.scheduled_for);
        const localDateTime = new Date(schedDate.getTime() - (schedDate.getTimezoneOffset() * 60000))
          .toISOString()
          .slice(0, 16);
        setScheduledFor(localDateTime);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    setCurrentImageUrl(null);
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

  async function handleUpdate(action: "draft" | "publish" | "schedule") {
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

    setSaving(true);
    setError(null);

    try {
      const {data: {user}} = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let imageUrl = currentImageUrl;

      // Upload new featured image if provided
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

        // Optionally delete old image
        if (currentImageUrl) {
          const oldFileName = currentImageUrl.split("/").pop();
          if (oldFileName) {
            await supabase.storage.from("article-images").remove([oldFileName]);
          }
        }
      } else if (!useFeaturedImage) {
        imageUrl = null;
      }

      const slug = generateSlug(title);
      const tagsArray = tags ? tags.split(",").map((t) => t.trim()) : null;

      let status: "draft" | "published" | "scheduled" = article?.status || "draft";
      let publishedAt = article?.published_at || null;
      let scheduledTime = null;

      if (action === "publish") {
        status = "published";
        if (!publishedAt) {
          publishedAt = new Date().toISOString();
        }
      } else if (action === "schedule") {
        status = "scheduled";
        scheduledTime = new Date(scheduledFor).toISOString();
      } else if (action === "draft") {
        status = "draft";
      }

      // Generate legacy content from blocks
      const legacyContent = contentBlocks
        .map((block) => {
          if (block.type === "text") {
            return block.content || "";
          } else {
            return `[Image: ${block.caption || "Article image"}]`;
          }
        })
        .join("\n\n");

      const { error: updateError } = await supabase
        .from("articles")
        .update({
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
          updated_at: new Date().toISOString(),
          status,
          published_at: publishedAt,
          scheduled_for: scheduledTime,
          section: sections[0] || "general", // Legacy
          sections: sections, // New
          category: category || null,
          tags: tagsArray,
          is_featured: isFeatured,
          is_breaking: isBreaking,
          breaking_news_duration: breakingNewsDuration,
          breaking_news_set_at: isBreaking && !article?.is_breaking ? new Date().toISOString() : (isBreaking ? article?.breaking_news_set_at : null),
          allow_comments: allowComments,
          meta_title: metaTitle || null,
          meta_description: metaDescription || null,
          updated_by: user.id,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      router.push("/admin/articles");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600">Article not found or access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/articles"
            className="text-blue-600 hover:underline flex items-center gap-1 mb-4"
          >
            ← Back to Articles
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black text-gray-900">Edit Article</h1>
            <span className="text-sm text-gray-500">
              Last updated: {new Date(article.updated_at).toLocaleString()}
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        <form className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Subtitle
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Excerpt *
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-4 py-2"
                  required
                />
              </div>
            </div>
          </div>

          {/* Featured Image */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Featured Image (Cover)</h2>
            
            {/* Toggle */}
            <div className="flex items-center gap-3 mb-4 p-4 bg-gray-50 rounded-lg">
              <label className="text-sm font-semibold text-gray-900">
                Use Featured Image:
              </label>
              <button
                type="button"
                onClick={() => setUseFeaturedImage(!useFeaturedImage)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  useFeaturedImage ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    useFeaturedImage ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                {useFeaturedImage ? "Yes" : "No"}
              </span>
            </div>

            {useFeaturedImage && (
              <div className="space-y-4">
                {!imagePreview && !currentImageUrl ? (
                  <div>
                    <label className="block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
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
                      <p className="mt-2 text-sm text-gray-600">
                        Click to upload new featured image
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
                      src={imagePreview || currentImageUrl || ""}
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
                    {!imagePreview && currentImageUrl && (
                      <label className="absolute bottom-2 right-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 cursor-pointer">
                        Change Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                )}

                {(imagePreview || currentImageUrl) && (
                  <>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                      placeholder="Image caption (optional)"
                    />
                    <input
                      type="text"
                      value={imageCredit}
                      onChange={(e) => setImageCredit(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                      placeholder="Photo credit (optional)"
                    />
                  </>
                )}
              </div>
            )}

            {!useFeaturedImage && (
              <p className="text-sm text-gray-600 italic">
                No featured image will be displayed.
              </p>
            )}
          </div>

          {/* Content Blocks */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article Content</h2>
            <BlockEditor blocks={contentBlocks} onChange={setContentBlocks} />
          </div>

          {/* Sections */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Sections *</h2>
            <SectionSelector selectedSections={sections} onChange={setSections} />
          </div>

          {/* Category & Tags */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Category & Tags</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-4 py-2"
                />
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Article Options</h2>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-5 h-5"
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
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium flex items-center">
                    Breaking News
                    <Tooltip text="Check this for urgent, time-sensitive news that's currently developing. Breaking news articles display a special 'BREAKING' badge and are prioritized at the top of news feeds. Use sparingly for truly urgent stories." />
                  </span>
                </label>

                {isBreaking && (
                  <div className="ml-8 p-4 bg-red-50 rounded-lg border border-red-200">
                    <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center">
                      Breaking News Duration (hours)
                      <Tooltip text="How many hours this article should remain as breaking news. After this duration, it will automatically stop showing in the breaking news banner. Default is 24 hours." />
                    </label>
                    <input
                      type="number"
                      value={breakingNewsDuration}
                      onChange={(e) => setBreakingNewsDuration(Math.max(1, parseInt(e.target.value) || 24))}
                      min="1"
                      max="168"
                      className="w-32 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Breaking news will expire after {breakingNewsDuration} hour{breakingNewsDuration !== 1 ? 's' : ''} and automatically stop displaying in the banner.
                    </p>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={allowComments}
                  onChange={(e) => setAllowComments(e.target.checked)}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium flex items-center">
                  Allow Comments
                  <Tooltip text="Check this to enable reader comments on this article. Uncheck to disable comments (useful for sensitive topics or when you want to prevent discussion). Comments are enabled by default." />
                </span>
              </label>
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">SEO Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Meta Title (for Google)
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={60}
                  className="w-full border border-gray-300 rounded-md px-4 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {metaTitle.length}/60 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Meta Description (for Google)
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  maxLength={160}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-4 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {metaDescription.length}/160 characters
                </p>
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              {article?.status === "published" ? "Update Article" : "Publishing"}
              <Tooltip text={article?.status === "published" ? "Update your published article immediately or schedule the changes for later." : "Control when your article goes live. You can publish immediately, save as a draft to work on later, or schedule it to publish automatically at a future date and time."} />
            </h2>
            
            <div className="space-y-4">
              {/* For published articles - show update options */}
              {article?.status === "published" ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> This article is currently published and visible to readers. 
                      You can update it immediately or schedule the changes for later.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-semibold text-gray-900 flex items-center">
                        Schedule Update For (optional)
                        <Tooltip text="Schedule when these changes should go live. Leave empty to update the article immediately. The updated version will replace the current version at the scheduled time." />
                      </label>
                    </div>
                    <DateTimePicker
                      value={scheduledFor}
                      onChange={setScheduledFor}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => handleUpdate("publish")}
                      disabled={saving}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                    >
                      {saving ? "Updating..." : "Update Article Now"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdate("schedule")}
                      disabled={saving || !scheduledFor}
                      className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold"
                    >
                      Schedule Update
                    </button>
                  </div>

                  <div className="pt-2 text-xs text-gray-600 border-t mt-4">
                    <p>• <strong>Update Article Now:</strong> Changes go live immediately</p>
                    <p>• <strong>Schedule Update:</strong> Changes go live at the date/time you set above</p>
                  </div>
                </>
              ) : (
                /* For drafts/scheduled - show normal publishing options */
                <>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm font-semibold text-gray-900 flex items-center">
                        Schedule For (optional)
                        <Tooltip text="Set a specific date and time (Eastern Time) for this article to be automatically published. Leave empty to publish immediately or save as draft." />
                      </label>
                    </div>
                    <DateTimePicker
                      value={scheduledFor}
                      onChange={setScheduledFor}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => handleUpdate("draft")}
                      disabled={saving}
                      className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-semibold"
                    >
                      Save as Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdate("schedule")}
                      disabled={saving || !scheduledFor}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-semibold"
                    >
                      Schedule
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdate("publish")}
                      disabled={saving}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
                    >
                      {saving ? "Publishing..." : "Publish Now"}
                    </button>
                  </div>

                  <div className="pt-2 space-y-1 text-xs text-gray-600 border-t">
                    <p>• <strong>Save as Draft:</strong> Article saved but NOT visible to public</p>
                    <p>• <strong>Schedule:</strong> Article will auto-publish at the date/time you set above</p>
                    <p>• <strong>Publish Now:</strong> Article goes live immediately</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
