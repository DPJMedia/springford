"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Ad, AdSetting } from "@/lib/types/database";

type AdDisplayProps = {
  adSlot: string;
  className?: string;
  fallbackComponent?: React.ReactNode;
};

type AdWithFillSetting = Ad & { fill_section_for_slot?: boolean };

export function AdDisplay({ adSlot, className = "", fallbackComponent }: AdDisplayProps) {
  const [ad, setAd] = useState<AdWithFillSetting | null>(null);
  const [adSetting, setAdSetting] = useState<AdSetting | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [activeAdsList, setActiveAdsList] = useState<AdWithFillSetting[]>([]);
  const supabase = createClient();

  // Rotation effect
  useEffect(() => {
    if (activeAdsList.length <= 1) return;

    const adsWithRuntime = activeAdsList.filter((a) => a.runtime_seconds);
    if (adsWithRuntime.length <= 1) return;

    const currentAd = activeAdsList[currentAdIndex];
    if (!currentAd || !currentAd.runtime_seconds) return;

    const timeout = setTimeout(() => {
      const nextIndex = (currentAdIndex + 1) % activeAdsList.length;
      setCurrentAdIndex(nextIndex);
      setAd(activeAdsList[nextIndex]);
    }, currentAd.runtime_seconds * 1000);

    return () => clearTimeout(timeout);
  }, [activeAdsList, currentAdIndex]);

  // Fetch ads effect
  useEffect(() => {
    async function fetchAds() {
      try {
        // Fetch ad setting first
        const { data: setting } = await supabase
          .from("ad_settings")
          .select("*")
          .eq("ad_slot", adSlot)
          .single();

        setAdSetting(setting);

        // Fetch all active ads for this slot using junction table
        const now = new Date().toISOString();
        const { data: assignments } = await supabase
          .from("ad_slot_assignments")
          .select("ad_id, fill_section, ads!inner(*)")
          .eq("ad_slot", adSlot);

        if (assignments && assignments.length > 0) {
          // Filter active ads and attach per-slot fill setting
          const filteredAds = assignments
            .map((a: any) => ({
              ...a.ads,
              fill_section_for_slot: a.fill_section ?? true,
            }))
            .filter((ad: AdWithFillSetting) => {
              return (
                ad.is_active &&
                new Date(ad.start_date) <= new Date(now) &&
                new Date(ad.end_date) >= new Date(now)
              );
            })
            .sort((a: AdWithFillSetting, b: AdWithFillSetting) => {
              // Sort by display_order, then by created_at
              if (a.display_order !== b.display_order) {
                return (a.display_order || 0) - (b.display_order || 0);
              }
              return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

          if (filteredAds.length > 0) {
            setActiveAdsList(filteredAds);
            setAd(filteredAds[0]);
            setCurrentAdIndex(0);
          } else {
            setActiveAdsList([]);
            setAd(null);
          }
        } else {
          // Fallback to legacy ad_slot column
          const { data: activeAd } = await supabase
            .from("ads")
            .select("*")
            .eq("ad_slot", adSlot)
            .eq("is_active", true)
            .lte("start_date", now)
            .gte("end_date", now)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeAd) {
            setAd(activeAd);
            setActiveAdsList([activeAd]);
          } else {
            setAd(null);
            setActiveAdsList([]);
          }
        }
      } catch (error) {
        console.error("Error fetching ad:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAds();
  }, [adSlot, supabase]);

  if (loading) {
    return (
      <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`}>
        <div className="h-32 w-full"></div>
      </div>
    );
  }

  // If there's an active ad, display it
  if (ad) {
    // Determine ad type and appropriate sizing
    const isBanner = adSlot.includes("banner");
    const isSidebar = adSlot.includes("sidebar");
    const isInline = adSlot.includes("inline");
    
    // Set fixed height based on ad type to match preview
    let heightClass = "h-32"; // Default inline height
    if (isBanner) {
      heightClass = "h-24"; // Banner: 96px (970x90 or 728x90)
    } else if (isSidebar) {
      // Larger sidebar ads for article page
      if (adSlot === "article-sidebar-top") {
        heightClass = "h-[500px]"; // Top sidebar: 500px (very tall ad, aligns with article image)
      } else if (adSlot === "article-sidebar-bottom") {
        heightClass = "h-[500px]"; // Bottom sidebar: 500px (same size as top, sticky)
      } else if (adSlot === "homepage-sidebar-top") {
        heightClass = "h-64"; // Homepage sidebar top: 256px (box-shaped, static)
      } else {
        heightClass = "h-48"; // Default sidebar: 192px (300x250)
      }
    } else if (isInline) {
      heightClass = "h-32"; // Inline: 128px (728x90)
    }
    
    // Determine object-fit based on per-slot fill_section setting
    const objectFit = ad.fill_section_for_slot !== false ? "object-cover" : "object-contain";
    
    return (
      <a
        href={ad.link_url}
        target="_blank"
        rel="noopener noreferrer"
        className={`block hover:opacity-90 transition-opacity ${className}`}
      >
        <img
          src={ad.image_url}
          alt={ad.title || "Advertisement"}
          className={`w-full rounded-lg ${heightClass} ${objectFit}`}
        />
      </a>
    );
  }

  // If no ad but fallback is enabled, show fallback
  if (adSetting?.use_fallback) {
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    // Default Diffuse.AI fallback
    if (adSetting.fallback_ad_code === "diffuse-ai") {
      return (
        <div className={`bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center p-6 ${className}`}>
          <div className="text-center">
            <div className="text-3xl mb-2">📢</div>
            <p className="font-bold text-gray-700 text-sm mb-1">Advertisement</p>
            <p className="text-xs text-gray-600">Powered by Diffuse.AI</p>
          </div>
        </div>
      );
    }
  }

  // No ad and no fallback - return null (don't show anything)
  return null;
}

