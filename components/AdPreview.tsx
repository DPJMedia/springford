"use client";

import type { Article } from "@/lib/types/database";

type AdPreviewProps = {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  previewAd?: {
    image_url: string;
    title: string | null;
  };
  currentTab?: "homepage" | "article";
  onTabChange?: (tab: "homepage" | "article") => void;
};

// Mock article for preview
const mockArticle: Article = {
  id: "preview",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  title: "Sample Article Title",
  slug: "sample-article",
  subtitle: "This is a sample article subtitle",
  excerpt: "This is a preview of how your ad will appear on the website.",
  content: "",
  content_blocks: [],
  image_url: null,
  image_caption: null,
  image_credit: null,
  use_featured_image: false,
  status: "published",
  published_at: new Date().toISOString(),
  scheduled_for: null,
  section: "general",
  sections: ["general"],
  category: null,
  tags: [],
  author_id: null,
  author_name: "Preview Author",
  meta_title: null,
  meta_description: null,
  view_count: 0,
  share_count: 0,
  is_featured: false,
  is_breaking: false,
  breaking_news_duration: 0,
  breaking_news_set_at: null,
  allow_comments: false,
  updated_by: null,
};

export function AdPreview({
  selectedSlots,
  onSlotClick,
  previewAd,
  currentTab = "homepage",
  onTabChange,
}: AdPreviewProps) {
  function isSlotSelected(slot: string) {
    return selectedSlots.includes(slot);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onTabChange?.("homepage")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentTab === "homepage"
              ? "bg-[color:var(--color-riviera-blue)] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Homepage
        </button>
        <button
          onClick={() => onTabChange?.("article")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentTab === "article"
              ? "bg-[color:var(--color-riviera-blue)] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Article Page
        </button>
      </div>

      {currentTab === "homepage" ? (
        <HomepagePreview
          selectedSlots={selectedSlots}
          onSlotClick={onSlotClick}
          isSlotSelected={isSlotSelected}
          previewAd={previewAd}
        />
      ) : (
        <ArticlePreview
          selectedSlots={selectedSlots}
          onSlotClick={onSlotClick}
          isSlotSelected={isSlotSelected}
          previewAd={previewAd}
        />
      )}
    </div>
  );
}

function HomepagePreview({
  selectedSlots,
  onSlotClick,
  isSlotSelected,
  previewAd,
}: {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  isSlotSelected: (slot: string) => boolean;
  previewAd?: { image_url: string; title: string | null };
}) {
  // Helper function to render an ad slot
  const renderAdSlot = (
    slotId: string,
    sectionNumber: number,
    label: string,
    recommendedSize: string,
    heightClass: string
  ) => (
    <div
      onClick={() => onSlotClick(slotId)}
      className={`mb-6 p-4 border-2 rounded-lg transition cursor-pointer ${
        isSlotSelected(slotId)
          ? "border-[color:var(--color-riviera-blue)] bg-blue-50"
          : "border-dashed border-gray-300 hover:border-gray-400"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold text-blue-700">SECTION {sectionNumber}: {label}</div>
        <div className="text-xs font-medium text-blue-600">Recommended: {recommendedSize}</div>
      </div>
      {previewAd && isSlotSelected(slotId) ? (
        <div className={`relative w-full ${heightClass} bg-gray-100 rounded overflow-hidden`}>
          <img
            src={previewAd.image_url}
            alt={previewAd.title || "Ad preview"}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <div className={`w-full ${heightClass} bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm`}>
          {isSlotSelected(slotId) ? "Ad Preview" : "Click to add ad here"}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold">Spring-Ford Press</h1>
      </div>

      {/* AD SECTION 1: Banner Below Hero */}
      {renderAdSlot("homepage-banner-top", 1, "Banner Below Hero", "970x90 (10.8:1)", "h-24")}

      {/* AD SECTION 1.2: Banner Below Hero (Mobile Only) */}
      {renderAdSlot("homepage-banner-top-mobile", 1.2, "Banner Below Hero (Mobile Only)", "300x150 (2:1)", "h-24")}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Top Stories</h2>
            <p className="text-gray-500 text-sm mb-4">Article content goes here...</p>
          </div>

          {/* Disclaimer: Sections 5, 6, 7 are desktop-only on the live site */}
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>Note:</strong> Ads in Sections 5, 6, and 7 (728×90) appear on <strong>desktop only</strong>. They do not show on mobile.
            </p>
          </div>

          {/* AD SECTION 5: Main Content Top */}
          {renderAdSlot("homepage-content-top", 5, "Main Content Top", "728x90 (8:1)", "h-24")}

          <p className="text-gray-500 text-sm">Latest News section...</p>

          {/* AD SECTION 6: Main Content Middle 1 */}
          {renderAdSlot("homepage-content-middle-1", 6, "Main Content Middle 1", "728x90 (8:1)", "h-24")}

          <p className="text-gray-500 text-sm">Business section...</p>

          {/* AD SECTION 7: Main Content Middle 2 */}
          {renderAdSlot("homepage-content-middle-2", 7, "Main Content Middle 2", "728x90 (8:1)", "h-24")}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* AD SECTION 2: Sidebar Top (Static Box) */}
          {renderAdSlot("homepage-sidebar-top", 2, "Sidebar Top (Above Trending)", "300x300 (1:1)", "h-64")}

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm font-bold mb-2">Trending Now</h3>
            <p className="text-xs text-gray-500">Trending articles...</p>
          </div>

          {/* AD SECTION 3: Sidebar Middle */}
          {renderAdSlot("homepage-sidebar-middle", 3, "Sidebar Middle", "300x250 (1.2:1)", "h-48")}

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm font-bold mb-2">Most Read</h3>
            <p className="text-xs text-gray-500">Most read articles...</p>
          </div>

          {/* AD SECTION 4: Sidebar Bottom */}
          {renderAdSlot("homepage-sidebar-bottom", 4, "Sidebar Bottom", "300x250 (1.2:1)", "h-48")}
        </div>
      </div>

      {/* AD SECTION 8: Banner Bottom */}
      <div className="mt-6">
        {renderAdSlot("homepage-banner-bottom", 8, "Banner Bottom", "970x90 (10.8:1)", "h-24")}
      </div>
    </div>
  );
}

function ArticlePreview({
  selectedSlots,
  onSlotClick,
  isSlotSelected,
  previewAd,
}: {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  isSlotSelected: (slot: string) => boolean;
  previewAd?: { image_url: string; title: string | null };
}) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold">Spring-Ford Press</h1>
      </div>

      {/* Article Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Article Title</h2>
            <p className="text-gray-600 mb-4">Article content goes here...</p>
            <p className="text-gray-500 text-sm">More article content...</p>
          </div>

          {/* Inline Ad Slot 1 */}
          <div
            onClick={() => onSlotClick("article-inline-1")}
            className={`p-4 border-2 rounded-lg transition cursor-pointer ${
              isSlotSelected("article-inline-1")
                ? "border-[color:var(--color-riviera-blue)] bg-blue-50"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-500">INLINE AD SLOT 1</div>
              <div className="text-xs font-medium text-blue-600">Recommended: 728x90 (8:1)</div>
            </div>
            {previewAd && isSlotSelected("article-inline-1") ? (
              <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden">
                <img
                  src={previewAd.image_url}
                  alt={previewAd.title || "Ad preview"}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                {isSlotSelected("article-inline-1") ? "Ad Preview" : "Click to add ad here"}
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-500 text-sm mb-4">Continued article content...</p>
          </div>

          {/* Inline Ad Slot 2 */}
          <div
            onClick={() => onSlotClick("article-inline-2")}
            className={`p-4 border-2 rounded-lg transition cursor-pointer ${
              isSlotSelected("article-inline-2")
                ? "border-[color:var(--color-riviera-blue)] bg-blue-50"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-500">INLINE AD SLOT 2</div>
              <div className="text-xs font-medium text-blue-600">Recommended: 728x90 (8:1)</div>
            </div>
            {previewAd && isSlotSelected("article-inline-2") ? (
              <div className="relative w-full h-32 bg-gray-100 rounded overflow-hidden">
                <img
                  src={previewAd.image_url}
                  alt={previewAd.title || "Ad preview"}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                {isSlotSelected("article-inline-2") ? "Ad Preview" : "Click to add ad here"}
              </div>
            )}
          </div>

          <div>
            <p className="text-gray-500 text-sm">Final article content and related stories...</p>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Top Sidebar Ad Slot - Very Large, Static */}
          <div
            onClick={() => onSlotClick("article-sidebar-top")}
            className={`p-4 border-2 rounded-lg transition cursor-pointer ${
              isSlotSelected("article-sidebar-top")
                ? "border-[color:var(--color-riviera-blue)] bg-blue-50"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="text-xs font-semibold text-gray-500">TOP SIDEBAR AD (Static)</div>
              <div className="text-xs font-medium text-blue-600">Recommended: 400x500 (Large Rectangle)</div>
            </div>
            {previewAd && isSlotSelected("article-sidebar-top") ? (
              <div className="relative w-full h-[500px] bg-gray-100 rounded overflow-hidden">
                <img
                  src={previewAd.image_url}
                  alt={previewAd.title || "Ad preview"}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-[500px] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                {isSlotSelected("article-sidebar-top") ? "Ad Preview" : "Click to add ad here"}
              </div>
            )}
          </div>

          {/* Recommended Stories Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Recommended Stories</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded p-2 border border-gray-200">
                  <div className="h-16 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded mb-1"></div>
                  <div className="h-2 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Sidebar Ad Slot - Sticky */}
          <div
            onClick={() => onSlotClick("article-sidebar-bottom")}
            className={`p-4 border-2 rounded-lg transition cursor-pointer ${
              isSlotSelected("article-sidebar-bottom")
                ? "border-[color:var(--color-riviera-blue)] bg-blue-50"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="text-xs font-semibold text-gray-500">BOTTOM SIDEBAR AD (Sticky)</div>
              <div className="text-xs font-medium text-blue-600">Recommended: 400x500 (Large Rectangle)</div>
            </div>
            {previewAd && isSlotSelected("article-sidebar-bottom") ? (
              <div className="relative w-full h-[500px] bg-gray-100 rounded overflow-hidden">
                <img
                  src={previewAd.image_url}
                  alt={previewAd.title || "Ad preview"}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
            ) : (
              <div className="w-full h-[500px] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                {isSlotSelected("article-sidebar-bottom") ? "Ad Preview" : "Click to add ad here"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
