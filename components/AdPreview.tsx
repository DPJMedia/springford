"use client";

import type { Article } from "@/lib/types/database";
import { getAdSlotTableLabel } from "@/lib/advertising/adSlots";
import { useTenant } from "@/lib/tenant/TenantProvider";

export type AdOccupant = { id: string; title: string };

type AdPreviewProps = {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  previewAd?: {
    image_url: string;
    title: string | null;
  };
  /** For each slot id, ads currently assigned (for “currently in slot” + remove). */
  adsBySlot?: Record<string, AdOccupant[]>;
  /** Remove another ad’s assignment from this slot (does not delete the ad). */
  onRemoveAdFromSlot?: (adId: string, slotId: string) => void;
  currentTab?: "homepage-desktop" | "homepage-mobile" | "article-desktop" | "article-mobile";
  onTabChange?: (tab: "homepage-desktop" | "homepage-mobile" | "article-desktop" | "article-mobile") => void;
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
  is_advertisement: false,
  updated_by: null,
  visibility: "public",
};

function SlotOccupantList({
  ads,
  slotId,
  onRemove,
  className = "",
  variant = "default",
}: {
  ads: AdOccupant[];
  slotId: string;
  onRemove?: (adId: string, slotId: string) => void;
  className?: string;
  /** `overlay`: semi-opaque panel on top of ad image for readable gray text */
  variant?: "default" | "overlay";
}) {
  if (ads.length === 0) return null;
  const panel =
    variant === "overlay"
      ? "rounded-md bg-white/95 px-3 py-2 shadow-md ring-1 ring-black/5"
      : "";

  return (
    <div
      className={`flex w-full flex-col items-center gap-2 text-center ${panel} ${className}`}
      onClick={(e) => e.stopPropagation()}
      role="presentation"
    >
      <p className="text-xs font-semibold text-gray-600">Currently in this slot:</p>
      <div className="w-full space-y-1">
        {ads.map((a) => (
          <div key={a.id} className="truncate text-xs font-medium text-gray-700">
            {a.title}
          </div>
        ))}
      </div>
      {onRemove && (
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {ads.map((a) => (
            <button
              key={a.id}
              type="button"
              className="rounded-md bg-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-600 shadow-sm transition hover:bg-gray-300"
              aria-label={`Remove “${a.title}” from this slot`}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(a.id, slotId);
              }}
            >
              Remove
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdPreview({
  selectedSlots,
  onSlotClick,
  previewAd,
  adsBySlot = {},
  onRemoveAdFromSlot,
  currentTab = "homepage-desktop",
  onTabChange,
}: AdPreviewProps) {
  function isSlotSelected(slot: string) {
    return selectedSlots.includes(slot);
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onTabChange?.("homepage-desktop")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentTab === "homepage-desktop"
              ? "bg-[color:var(--admin-accent)] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Homepage (Desktop)
        </button>
        <button
          onClick={() => onTabChange?.("homepage-mobile")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentTab === "homepage-mobile"
              ? "bg-[color:var(--admin-accent)] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Homepage (Mobile)
        </button>
        <button
          onClick={() => onTabChange?.("article-desktop")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentTab === "article-desktop"
              ? "bg-[color:var(--admin-accent)] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Article (Desktop)
        </button>
        <button
          onClick={() => onTabChange?.("article-mobile")}
          className={`px-4 py-2 rounded-md text-sm font-semibold transition ${
            currentTab === "article-mobile"
              ? "bg-[color:var(--admin-accent)] text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Article (Mobile)
        </button>
      </div>

      {currentTab === "homepage-desktop" ? (
        <HomepagePreview
          selectedSlots={selectedSlots}
          onSlotClick={onSlotClick}
          isSlotSelected={isSlotSelected}
          previewAd={previewAd}
          adsBySlot={adsBySlot}
          onRemoveAdFromSlot={onRemoveAdFromSlot}
        />
      ) : currentTab === "homepage-mobile" ? (
        <HomepageMobilePreview
          selectedSlots={selectedSlots}
          onSlotClick={onSlotClick}
          isSlotSelected={isSlotSelected}
          previewAd={previewAd}
          adsBySlot={adsBySlot}
          onRemoveAdFromSlot={onRemoveAdFromSlot}
        />
      ) : currentTab === "article-desktop" ? (
        <ArticlePreview
          selectedSlots={selectedSlots}
          onSlotClick={onSlotClick}
          isSlotSelected={isSlotSelected}
          previewAd={previewAd}
          adsBySlot={adsBySlot}
          onRemoveAdFromSlot={onRemoveAdFromSlot}
        />
      ) : (
        <ArticleMobilePreview
          selectedSlots={selectedSlots}
          onSlotClick={onSlotClick}
          isSlotSelected={isSlotSelected}
          previewAd={previewAd}
          adsBySlot={adsBySlot}
          onRemoveAdFromSlot={onRemoveAdFromSlot}
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
  adsBySlot,
  onRemoveAdFromSlot,
}: {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  isSlotSelected: (slot: string) => boolean;
  previewAd?: { image_url: string; title: string | null };
  adsBySlot: Record<string, AdOccupant[]>;
  onRemoveAdFromSlot?: (adId: string, slotId: string) => void;
}) {
  const { name: siteName } = useTenant();
  const currentInSlot = (slotId: string) => adsBySlot[slotId] ?? [];

  const renderAdSlot = (slotId: string, recommendedSize: string, heightClass: string) => {
    const currentAds = currentInSlot(slotId);
    return (
      <div
        onClick={() => onSlotClick(slotId)}
        className={`mb-6 p-4 border-2 rounded-lg transition cursor-pointer ${
          isSlotSelected(slotId)
            ? "border-[color:var(--admin-accent)] bg-black"
            : "border-dashed border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
          {getAdSlotTableLabel(slotId)}
          <span className="font-normal"> ({recommendedSize})</span>
        </div>
        {previewAd && isSlotSelected(slotId) ? (
          <div className={`relative w-full ${heightClass} bg-black rounded overflow-hidden`}>
            <img
              src={previewAd.image_url}
              alt={previewAd.title || "Ad preview"}
              className="w-full h-full object-cover"
              draggable={false}
            />
            {currentAds.length > 0 && (
              <div className="absolute bottom-1 left-2 right-2 max-h-32 overflow-y-auto">
                <SlotOccupantList
                  ads={currentAds}
                  slotId={slotId}
                  onRemove={onRemoveAdFromSlot}
                  variant="overlay"
                />
              </div>
            )}
          </div>
        ) : (
          <div
            className={`flex w-full flex-col ${heightClass} items-center justify-center rounded bg-gray-100 p-2 text-gray-400`}
          >
            {currentAds.length > 0 ? (
              <SlotOccupantList
                ads={currentAds}
                slotId={slotId}
                onRemove={onRemoveAdFromSlot}
                className="w-full justify-center px-1"
              />
            ) : (
              <span className="text-sm">Click to add ad here</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{siteName}</h1>
      </div>

      {renderAdSlot("homepage-banner-top", "3880×360 px", "h-24")}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-4">Top Stories</h2>
            <p className="text-gray-500 text-sm mb-4">Article content goes here...</p>
          </div>

          {/* AD SECTION 5: Main Content Top */}
          {renderAdSlot("homepage-content-top", "2912×360 px", "h-24")}

          <p className="text-gray-500 text-sm">Latest News section...</p>

          {/* AD SECTION 6: Main Content Middle 1 */}
          {renderAdSlot("homepage-content-middle-1", "2912×360 px", "h-24")}

          <p className="text-gray-500 text-sm">Business section...</p>

          {/* AD SECTION 7: Main Content Middle 2 */}
          {renderAdSlot("homepage-content-middle-2", "2912×360 px", "h-24")}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* AD SECTION 2: Sidebar Top (Static Box) */}
          {renderAdSlot("homepage-sidebar-top", "1200×1200 px", "h-64")}

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm font-bold mb-2">Trending Now</h3>
            <p className="text-xs text-gray-500">Trending articles...</p>
          </div>

          {/* AD SECTION 3: Sidebar Middle */}
          {renderAdSlot("homepage-sidebar-middle", "1200×1000 px", "h-48")}

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="text-sm font-bold mb-2">Editor's Picks</h3>
            <p className="text-xs text-gray-500">Editor's picks...</p>
          </div>

          {/* AD SECTION 4: Sidebar Bottom */}
          {renderAdSlot("homepage-sidebar-bottom", "1200×1000 px", "h-48")}
        </div>
      </div>

      {/* AD SECTION 8: Banner Bottom */}
      <div className="mt-6">
        {renderAdSlot("homepage-banner-bottom", "3880×360 px", "h-24")}
      </div>
    </div>
  );
}

function HomepageMobilePreview({
  selectedSlots,
  onSlotClick,
  isSlotSelected,
  previewAd,
  adsBySlot,
  onRemoveAdFromSlot,
}: {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  isSlotSelected: (slot: string) => boolean;
  previewAd?: { image_url: string; title: string | null };
  adsBySlot: Record<string, AdOccupant[]>;
  onRemoveAdFromSlot?: (adId: string, slotId: string) => void;
}) {
  const { name: siteName } = useTenant();
  const currentInSlot = (slotId: string) => adsBySlot[slotId] ?? [];
  const size = "1200×600 px";

  const renderMobileSlot = (slotId: string) => {
    const currentAds = currentInSlot(slotId);
    return (
      <div
        onClick={() => onSlotClick(slotId)}
        className={`mb-6 p-4 border-2 rounded-lg transition cursor-pointer ${
          isSlotSelected(slotId)
            ? "border-[color:var(--admin-accent)] bg-black"
            : "border-dashed border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
          {getAdSlotTableLabel(slotId)}
          <span className="font-normal"> ({size})</span>
        </div>
        {previewAd && isSlotSelected(slotId) ? (
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded bg-black">
            <img
              src={previewAd.image_url}
              alt={previewAd.title || "Ad preview"}
              className="h-full w-full object-cover"
              draggable={false}
            />
            {currentAds.length > 0 && (
              <div className="absolute bottom-1 left-2 right-2 max-h-32 overflow-y-auto">
                <SlotOccupantList
                  ads={currentAds}
                  slotId={slotId}
                  onRemove={onRemoveAdFromSlot}
                  variant="overlay"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-[2/1] w-full flex-col items-center justify-center rounded bg-gray-100 p-2 text-gray-400">
            {currentAds.length > 0 ? (
              <SlotOccupantList
                ads={currentAds}
                slotId={slotId}
                onRemove={onRemoveAdFromSlot}
                className="w-full justify-center px-1"
              />
            ) : (
              <span className="text-sm">Click to add ad here</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{siteName}</h1>
      </div>

      <div className="mb-6 p-4 rounded-lg bg-white border border-gray-200">
        <div className="h-40 bg-gray-200 rounded mb-3" />
        <div className="h-4 bg-gray-300 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
      </div>

      {renderMobileSlot("homepage-banner-top-mobile")}

      <div className="mb-4">
        <h2 className="text-lg font-bold mb-2">Latest News</h2>
        <p className="text-xs text-gray-500">Stories…</p>
      </div>

      {renderMobileSlot("homepage-mobile-above-most-read")}

      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Trending Now</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 bg-gray-200 rounded w-5/6" />
          ))}
        </div>
      </div>

      {renderMobileSlot("homepage-mobile-above-editors-picks")}

      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Editor’s Picks</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-3 bg-gray-200 rounded w-4/5" />
          ))}
        </div>
      </div>

      {renderMobileSlot("homepage-mobile-between-editors-picks-footer")}

      <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-500">Footer</div>
    </div>
  );
}

function ArticlePreview({
  selectedSlots,
  onSlotClick,
  isSlotSelected,
  previewAd,
  adsBySlot = {},
  onRemoveAdFromSlot,
}: {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  isSlotSelected: (slot: string) => boolean;
  previewAd?: { image_url: string; title: string | null };
  adsBySlot?: Record<string, AdOccupant[]>;
  onRemoveAdFromSlot?: (adId: string, slotId: string) => void;
}) {
  const { name: siteName } = useTenant();
  const currentInSlot = (slotId: string) => adsBySlot[slotId] ?? [];

  const renderSlotContent = (slotId: string, heightClass: string) => {
    const currentAds = currentInSlot(slotId);
    if (previewAd && isSlotSelected(slotId)) {
      return (
        <div className={`relative w-full ${heightClass} overflow-hidden rounded bg-black`}>
          <img
            src={previewAd.image_url}
            alt={previewAd.title || "Ad preview"}
            className="h-full w-full object-cover"
            draggable={false}
          />
          {currentAds.length > 0 && (
            <div className="absolute bottom-1 left-2 right-2 max-h-32 overflow-y-auto">
              <SlotOccupantList
                ads={currentAds}
                slotId={slotId}
                onRemove={onRemoveAdFromSlot}
                variant="overlay"
              />
            </div>
          )}
        </div>
      );
    }
    return (
      <div
        className={`flex w-full flex-col ${heightClass} items-center justify-center rounded bg-gray-100 p-2 text-gray-400`}
      >
        {currentAds.length > 0 ? (
          <SlotOccupantList
            ads={currentAds}
            slotId={slotId}
            onRemove={onRemoveAdFromSlot}
            className="w-full justify-center px-1"
          />
        ) : isSlotSelected(slotId) ? (
          <span className="text-sm">Ad Preview</span>
        ) : (
          <span className="text-sm">Click to add ad here</span>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold">{siteName}</h1>
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
                ? "border-[color:var(--admin-accent)] bg-black"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
              {getAdSlotTableLabel("article-inline-1")}
              <span className="font-normal"> (2912×360 px)</span>
            </div>
            {renderSlotContent("article-inline-1", "h-32")}
          </div>

          <div>
            <p className="text-gray-500 text-sm mb-4">Continued article content...</p>
          </div>

          {/* Inline Ad Slot 2 */}
          <div
            onClick={() => onSlotClick("article-inline-2")}
            className={`p-4 border-2 rounded-lg transition cursor-pointer ${
              isSlotSelected("article-inline-2")
                ? "border-[color:var(--admin-accent)] bg-black"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
              {getAdSlotTableLabel("article-inline-2")}
              <span className="font-normal"> (2912×360 px)</span>
            </div>
            {renderSlotContent("article-inline-2", "h-32")}
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
                ? "border-[color:var(--admin-accent)] bg-black"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
              {getAdSlotTableLabel("article-sidebar-top")}
              <span className="font-normal"> (1600×2000 px)</span>
            </div>
            {renderSlotContent("article-sidebar-top", "h-[500px]")}
          </div>

          {/* Recommended Stories Section */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Recommended Stories</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded p-2 border border-gray-200">
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
                ? "border-[color:var(--admin-accent)] bg-black"
                : "border-dashed border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
              {getAdSlotTableLabel("article-sidebar-bottom")}
              <span className="font-normal"> (1600×2000 px)</span>
            </div>
            {renderSlotContent("article-sidebar-bottom", "h-[500px]")}
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticleMobilePreview({
  selectedSlots,
  onSlotClick,
  isSlotSelected,
  previewAd,
  adsBySlot = {},
  onRemoveAdFromSlot,
}: {
  selectedSlots: string[];
  onSlotClick: (slot: string) => void;
  isSlotSelected: (slot: string) => boolean;
  previewAd?: { image_url: string; title: string | null };
  adsBySlot?: Record<string, AdOccupant[]>;
  onRemoveAdFromSlot?: (adId: string, slotId: string) => void;
}) {
  const currentInSlot = (slotId: string) => adsBySlot[slotId] ?? [];
  const size = "1200×600 px";

  const renderMobileSlot = (slotId: string) => {
    const currentAds = currentInSlot(slotId);
    return (
      <div
        onClick={() => onSlotClick(slotId)}
        className={`mb-6 p-4 border-2 rounded-lg transition cursor-pointer ${
          isSlotSelected(slotId)
            ? "border-[color:var(--admin-accent)] bg-black"
            : "border-dashed border-gray-300 hover:border-gray-400"
        }`}
      >
        <div className="mb-2 text-xs font-bold text-[color:var(--admin-accent)]">
          {getAdSlotTableLabel(slotId)}
          <span className="font-normal"> ({size})</span>
        </div>
        {previewAd && isSlotSelected(slotId) ? (
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded bg-black">
            <img
              src={previewAd.image_url}
              alt={previewAd.title || "Ad preview"}
              className="h-full w-full object-cover"
              draggable={false}
            />
            {currentAds.length > 0 && (
              <div className="absolute bottom-1 left-2 right-2 max-h-32 overflow-y-auto">
                <SlotOccupantList
                  ads={currentAds}
                  slotId={slotId}
                  onRemove={onRemoveAdFromSlot}
                  variant="overlay"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex aspect-[2/1] w-full flex-col items-center justify-center rounded bg-gray-100 p-2 text-gray-400">
            {currentAds.length > 0 ? (
              <SlotOccupantList
                ads={currentAds}
                slotId={slotId}
                onRemove={onRemoveAdFromSlot}
                className="w-full justify-center px-1"
              />
            ) : (
              <span className="text-sm">Click to add ad here</span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h1 className="text-2xl font-bold">Article</h1>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Article Title</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-11/12" />
          <div className="h-3 bg-gray-200 rounded w-10/12" />
        </div>
      </div>

      {renderMobileSlot("article-mobile-inline")}

      <div className="mb-6 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-10/12" />
        <div className="h-3 bg-gray-200 rounded w-9/12" />
      </div>

      {renderMobileSlot("article-mobile-end")}

      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex flex-wrap gap-2">
          {["Tag 1", "Tag 2", "Tag 3"].map((t) => (
            <span key={t} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
              {t}
            </span>
          ))}
        </div>
      </div>

      {renderMobileSlot("article-mobile-below-tags")}
    </div>
  );
}
