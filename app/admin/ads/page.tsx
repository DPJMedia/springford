"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AdPreview } from "@/components/AdPreview";
import type { Ad } from "@/lib/types/database";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageLayout } from "@/components/admin/AdminPageLayout";
import { AdminActionsPanel } from "@/components/admin/AdminActionsPanel";
import {
  AD_SLOTS,
  getAdSlotTableLabel,
  sortAdSlotIdsByInventoryOrder,
  UNASSIGNED_AD_SLOT,
} from "@/lib/advertising/adSlots";

const ET_TIMEZONE = "America/New_York";

function formatAdScheduleDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Calendar YYYY-MM-DD for an ISO timestamp in Eastern Time. */
function formatYmdET(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ET_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(iso))
    .replace(/\//g, "-");
}

/**
 * End calendar date (YYYY-MM-DD) = day before the N-month anniversary of start.
 * e.g. Jan 15 + 1 month → ends Feb 14 (inclusive span).
 */
function endYmdAfterNCalendarMonths(startYmd: string, n: number): string {
  const [y, m, d] = startYmd.split("-").map(Number);
  const anniversary = new Date(y, m - 1 + n, d);
  const end = new Date(anniversary.getFullYear(), anniversary.getMonth(), anniversary.getDate() - 1);
  const ey = end.getFullYear();
  const em = String(end.getMonth() + 1).padStart(2, "0");
  const ed = String(end.getDate()).padStart(2, "0");
  return `${ey}-${em}-${ed}`;
}

/** How many calendar-month spans match this start/end pair (1–120), or null if none. */
function inferCustomMonthCount(startYmd: string, endYmd: string): number | null {
  for (let n = 1; n <= 120; n++) {
    if (endYmd === endYmdAfterNCalendarMonths(startYmd, n)) return n;
  }
  return null;
}

/** Approximate calendar-month span from start through end (minimum 1). */
function monthsInScheduleRange(startIso: string, endIso: string): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(1, months);
}

function AdStatusIcon({ status }: { status: "scheduled" | "active" | "expired" }) {
  const wrap = "inline-flex shrink-0 items-center";
  const icon = "size-[1em] shrink-0";
  if (status === "active") {
    return (
      <span className={wrap} title="Active" role="img" aria-label="Active">
        <svg className={`${icon} text-emerald-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    );
  }
  if (status === "scheduled") {
    return (
      <span className={wrap} title="Scheduled" role="img" aria-label="Scheduled">
        <svg className={`${icon} text-amber-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
    );
  }
  return (
    <span className={wrap} title="Expired" role="img" aria-label="Expired">
      <svg className={`${icon} text-[var(--admin-text-muted)]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    </span>
  );
}

function AdTableThumb({
  imageUrl,
  title,
  status,
}: {
  imageUrl: string;
  title: string;
  status: "scheduled" | "active" | "expired";
}) {
  const [dims, setDims] = useState<string | null>(null);
  return (
    <div className="flex w-max min-w-0 max-w-[min(100%,28rem)] items-center gap-2 sm:gap-3">
      <div className="relative aspect-video w-[4.5rem] shrink-0 overflow-hidden rounded-md bg-[var(--admin-table-header-bg)] sm:w-[5.5rem] md:w-[6.5rem]">
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onLoad={(e) => {
            const { naturalWidth, naturalHeight } = e.currentTarget;
            setDims(
              `${naturalWidth.toLocaleString()} × ${naturalHeight.toLocaleString()} px`
            );
          }}
        />
      </div>
      <div className="flex min-w-0 shrink flex-col gap-0.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="m-0 min-w-0 flex-1 text-sm font-medium leading-snug text-[var(--admin-text)] break-words">
            {title || "Untitled Ad"}
          </p>
          <AdStatusIcon status={status} />
        </div>
        <p className="m-0 text-xs font-normal tabular-nums leading-snug text-[var(--admin-text-muted)]">
          {dims ?? "…"}
        </p>
      </div>
    </div>
  );
}

function AdSlotsText({ slots }: { slots: string[] }) {
  const ordered = sortAdSlotIdsByInventoryOrder(slots);
  return (
    <div className="flex flex-col gap-1.5 text-sm font-medium leading-snug text-[var(--admin-text)]">
      {ordered.map((slot) => (
        <span key={slot} className="block break-words">
          {getAdSlotTableLabel(slot)}
        </span>
      ))}
    </div>
  );
}

function AdScheduleCell({
  startDate,
  endDate,
  formatDate,
}: {
  startDate: string;
  endDate: string;
  formatDate: (iso: string) => string;
}) {
  const line = `${formatDate(startDate)} – ${formatDate(endDate)}`;
  const monthCount = monthsInScheduleRange(startDate, endDate);
  const monthsLabel = monthCount === 1 ? "1 month" : `${monthCount} months`;
  return (
    <div className="flex min-w-0 flex-col items-end justify-center gap-0.5 text-[var(--admin-text)]">
      <span className="whitespace-nowrap text-sm font-medium leading-snug">{line}</span>
      <span className="whitespace-nowrap text-xs leading-snug text-[var(--admin-text-muted)]">
        ({monthsLabel})
      </span>
    </div>
  );
}

export default function AdsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Enhanced form state
  const [formData, setFormData] = useState({
    title: "",
    image_url: "",
    link_url: "",
    selectedSlots: [] as string[], // Multiple slots
    start_date: "",
    end_date: "",
    /** Calendar months the campaign runs after the start date */
    campaignMonths: 1,
    is_active: true,
    fill_section: true, // Default to fill section
    ad_label_color: "", // Hex for "Advertisement" label (empty = default gray)
    /** Empty string shows "Select position" until chosen */
    ad_label_position: "" as "" | "bottom-right" | "bottom-left" | "top-right" | "top-left",
  });
  // Per-slot fill section settings
  const [slotFillSettings, setSlotFillSettings] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<
    "homepage-desktop" | "homepage-mobile" | "article-desktop" | "article-mobile"
  >("homepage-desktop");

  // Search, sort, filter for ad list
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-az" | "name-za" | "date-newest" | "date-oldest">("date-newest");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile">("all");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  // In-app toast (replaces browser alert/confirm for action feedback)
  const [toast, setToast] = useState<{ message: string; onUndo?: () => void | Promise<void> } | null>(null);
  const [toastSecondsLeft, setToastSecondsLeft] = useState(10);
  const toastIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!toast) {
      if (toastIntervalRef.current) {
        clearInterval(toastIntervalRef.current);
        toastIntervalRef.current = null;
      }
      return;
    }
    let seconds = 10;
    setToastSecondsLeft(10);
    toastIntervalRef.current = setInterval(() => {
      seconds -= 1;
      setToastSecondsLeft(seconds);
      if (seconds <= 0) {
        if (toastIntervalRef.current) {
          clearInterval(toastIntervalRef.current);
          toastIntervalRef.current = null;
        }
        setToast(null);
      }
    }, 1000);
    return () => {
      if (toastIntervalRef.current) {
        clearInterval(toastIntervalRef.current);
        toastIntervalRef.current = null;
      }
    };
  }, [toast]);

  function dismissToast() {
    if (toastIntervalRef.current) {
      clearInterval(toastIntervalRef.current);
      toastIntervalRef.current = null;
    }
    setToast(null);
  }

  function showToast(message: string, onUndo?: () => void | Promise<void>) {
    setToast({ message, onUndo });
  }

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal]);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  // Auto-refresh ads every 30 seconds to update status
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    const interval = setInterval(() => {
      loadAds();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [isSuperAdmin]);

  // Track previous statuses to detect changes
  const previousStatusesRef = useRef<{ [key: string]: string }>({});

  // Update status display every second for real-time countdown and refresh when ads become active
  useEffect(() => {
    if (!isSuperAdmin || ads.length === 0) return;
    
    // Initialize previous statuses
    ads.forEach((ad: Ad) => {
      if (!previousStatusesRef.current[ad.id]) {
        previousStatusesRef.current[ad.id] = getAdStatus(ad);
      }
    });
    
    const interval = setInterval(() => {
      const now = new Date();
      let needsRefresh = false;
      
      // Check each ad to see if status changed
      ads.forEach((ad: Ad) => {
        const currentStatus = getAdStatus(ad);
        const previousStatus = previousStatusesRef.current[ad.id] || "scheduled";
        
        // If status changed from scheduled to active, refresh
        if (previousStatus === "scheduled" && currentStatus === "active") {
          needsRefresh = true;
          previousStatusesRef.current[ad.id] = currentStatus;
        }
        
        // Also check if ad just crossed the start time threshold
        const start = new Date(ad.start_date);
        const timeSinceStart = now.getTime() - start.getTime();
        if (timeSinceStart >= 0 && timeSinceStart < 3000 && ad.is_active && previousStatus === "scheduled") {
          needsRefresh = true;
          previousStatusesRef.current[ad.id] = "active";
        }
        
        // Update previous status
        if (previousStatusesRef.current[ad.id] !== currentStatus) {
          previousStatusesRef.current[ad.id] = currentStatus;
        }
      });
      
      if (needsRefresh) {
        loadAds(); // Refresh the ads list
      } else {
        // Force re-render to update status badges
        setAds((prevAds) => [...prevAds]);
      }
    }, 1000); // Every second

    return () => clearInterval(interval);
  }, [isSuperAdmin, ads.length]); // Re-run when ads change

  // Keep end date in sync from start date + campaign months (day-based schedule, no times).
  useEffect(() => {
    if (!showModal) return;
    if (!formData.start_date) return;
    const n = Math.max(1, Math.min(120, Math.floor(formData.campaignMonths) || 1));
    const nextEnd = endYmdAfterNCalendarMonths(formData.start_date, n);
    setFormData((f) => (f.end_date === nextEnd ? f : { ...f, end_date: nextEnd }));
  }, [showModal, formData.campaignMonths, formData.start_date]);

  async function checkSuperAdmin() {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", currentUser.id)
      .single();

    if (!profileData?.is_super_admin) {
      showToast("Only super admins can access this page.");
      router.push("/admin/articles");
      return;
    }

    setUser(currentUser);
    setIsSuperAdmin(true);
    loadAds();
  }

  async function loadAds() {
    const { data } = await supabase
      .from("ads")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Load slot assignments for each ad with fill_section settings
      const adsWithSlots = await Promise.all(
        data.map(async (ad) => {
          const { data: assignments } = await supabase
            .from("ad_slot_assignments")
            .select("ad_slot, fill_section")
            .eq("ad_id", ad.id);

          const slotSettings: Record<string, { fill_section: boolean }> = {};
          assignments?.forEach((a) => {
            slotSettings[a.ad_slot] = { fill_section: a.fill_section ?? true };
          });

          return {
            ...ad,
            slots: assignments?.map((a) => a.ad_slot) || [ad.ad_slot].filter(Boolean),
            slotSettings,
          };
        })
      );
      setAds(adsWithSlots as any);
    }
    setLoading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file.");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImagePreview(dataUrl);
        // Don't auto-open editor - user must select a slot first
      };
      reader.readAsDataURL(file);
    }
  }


  async function handleUploadImage() {
    if (!imageFile || !user) return;

    try {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `ad-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("ads")
        .upload(fileName, imageFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        // Check if it's an RLS policy error
        if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
          showToast("Storage permissions error. Run the storage policies SQL in Supabase. See ADS_SETUP.md.");
        } else {
          showToast("Error uploading image: " + uploadError.message);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("ads")
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      setImageFile(null);
      // Keep preview if we want to show editor
      if (formData.selectedSlots.length === 0) {
        setImagePreview(null);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      showToast("Error uploading image: " + (error.message || "Unknown error"));
    }
  }

  async function uploadImageBlob(blob: Blob, fileName: string): Promise<string | null> {
    try {
      const { error: uploadError } = await supabase.storage
        .from("ads")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
          showToast("Storage permissions error. Run the storage policies SQL in Supabase.");
        } else {
          showToast("Error uploading image: " + uploadError.message);
        }
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("ads")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      showToast("Error uploading image: " + (error.message || "Unknown error"));
      return null;
    }
  }

  function handleSlotClick(slot: string) {
    const currentSlots = formData.selectedSlots;
    if (currentSlots.includes(slot)) {
      setFormData({
        ...formData,
        selectedSlots: currentSlots.filter((s) => s !== slot),
      });
      // Remove from fill settings
      const newFillSettings = { ...slotFillSettings };
      delete newFillSettings[slot];
      setSlotFillSettings(newFillSettings);
    } else {
      setFormData({
        ...formData,
        selectedSlots: [...currentSlots, slot],
      });
      // Add to fill settings with default true
      setSlotFillSettings({
        ...slotFillSettings,
        [slot]: true,
      });
    }
  }

  async function handleRemoveAdFromSlot(adId: string, slotId: string) {
    try {
      const { error } = await supabase.rpc("remove_ad_from_slot", {
        p_ad_id: adId,
        p_ad_slot: slotId,
      });
      if (error) throw error;
      await loadAds();
      showToast("Ad removed from slot.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      showToast("Error: " + msg);
    }
  }

  /** Parse date + time (ET) to ISO string for DB. */
  function parseETDateTime(dateStr: string, timeStr: string): string {
    let hours = 0, minutes = 0;
    const timeMatch = timeStr.match(/(\d+)\s*:\s*(\d+)\s*(AM|PM)/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1]);
      minutes = parseInt(timeMatch[2]);
      const ampm = timeMatch[3].toUpperCase();
      if (ampm === "PM" && hours !== 12) hours += 12;
      else if (ampm === "AM" && hours === 12) hours = 0;
    } else {
      const parts = timeStr.split(":");
      hours = parseInt(parts[0]) || 0;
      minutes = parseInt(parts[1]) || 0;
    }
    const [year, month, day] = dateStr.split("-").map(Number);
    const etDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    const tempDate = new Date(`${etDateStr}-05:00`);
    const monthNum = month - 1;
    if (monthNum >= 2 && monthNum <= 10) tempDate.setHours(tempDate.getHours() + 1);
    return tempDate.toISOString();
  }

  /** Performs image upload and saves main ad (single creative per slot; no rotation). */
  async function doSaveAd(startDateTime: string, endDateTime: string): Promise<void> {
    let finalImageUrl = formData.image_url;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `ad-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("ads")
        .upload(fileName, imageFile, { cacheControl: "3600", upsert: false });
      if (uploadError) {
        if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
          showToast("Storage permissions error. Run the storage policies SQL in Supabase.");
        } else {
          showToast("Error uploading image: " + uploadError.message);
        }
        throw new Error(uploadError.message);
      }
      const { data: { publicUrl } } = supabase.storage.from("ads").getPublicUrl(fileName);
      finalImageUrl = publicUrl;
    } else if (imagePreview && !formData.image_url) {
      const response = await fetch(imagePreview);
      const blob = await response.blob();
      const fileName = `ad-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("ads")
        .upload(fileName, blob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
      if (uploadError) {
        if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
          showToast("Storage permissions error. Run the storage policies SQL in Supabase.");
        } else {
          showToast("Error uploading image: " + uploadError.message);
        }
        throw new Error(uploadError.message);
      }
      const { data: { publicUrl } } = supabase.storage.from("ads").getPublicUrl(fileName);
      finalImageUrl = publicUrl;
    }

    if (!finalImageUrl) {
      showToast("Please provide an image.");
      throw new Error("No image");
    }

    const primarySlot = formData.selectedSlots[0] ?? UNASSIGNED_AD_SLOT;

    if (editingAd) {
      const { error: updateError } = await supabase
        .from("ads")
        .update({
          title: formData.title || null,
          image_url: finalImageUrl,
          link_url: formData.link_url,
          ad_slot: primarySlot,
          start_date: startDateTime,
          end_date: endDateTime,
          runtime_seconds: null,
          display_order: 1,
          is_active: formData.is_active,
          fill_section: true,
          ad_label_color: formData.ad_label_color?.trim() || null,
          ad_label_position: formData.ad_label_position
            ? formData.ad_label_position
            : "bottom-right",
        })
        .eq("id", editingAd.id);
      if (updateError) throw updateError;
      await supabase.from("ad_slot_assignments").delete().eq("ad_id", editingAd.id);
      if (formData.selectedSlots.length > 0) {
        const assignments = formData.selectedSlots.map((slot) => ({
          ad_id: editingAd.id,
          ad_slot: slot,
          fill_section: true,
        }));
        const { error: assignError } = await supabase.from("ad_slot_assignments").insert(assignments);
        if (assignError) throw assignError;
      }
    } else {
      const { data: newAd, error: insertError } = await supabase
        .from("ads")
        .insert({
          title: formData.title || null,
          image_url: finalImageUrl,
          link_url: formData.link_url,
          ad_slot: primarySlot,
          start_date: startDateTime,
          end_date: endDateTime,
          runtime_seconds: null,
          display_order: 1,
          is_active: formData.is_active,
          fill_section: true,
          ad_label_color: formData.ad_label_color?.trim() || null,
          ad_label_position: formData.ad_label_position
            ? formData.ad_label_position
            : "bottom-right",
          created_by: user.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      if (formData.selectedSlots.length > 0) {
        const assignments = formData.selectedSlots.map((slot) => ({
          ad_id: newAd.id,
          ad_slot: slot,
          fill_section: true,
        }));
        const { error: assignError } = await supabase.from("ad_slot_assignments").insert(assignments);
        if (assignError) throw assignError;
      }
    }
  }

  async function handleSaveAd() {
    // Check if image is provided
    if (!imageFile && !formData.image_url) {
      showToast("Please provide an image.");
      return;
    }
    
    if (!formData.link_url) {
      showToast("Please provide a link URL.");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      showToast("Please set start and end dates.");
      return;
    }

    const startDateTime = parseETDateTime(formData.start_date, "12:00 AM");
    const endDateTime = parseETDateTime(formData.end_date, "11:59 PM");

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      showToast("End date/time must be after start date/time.");
      return;
    }

    try {
      await doSaveAd(startDateTime, endDateTime);
      loadAds();
      handleCloseModal();
      showToast(editingAd ? "Ad updated." : "Ad created.");
    } catch (error: any) {
      showToast("Error saving ad: " + (error?.message ?? String(error)));
    }
  }

  async function handleDeleteAd(ad: any) {
    const adId = ad.id;
    const adSnapshot = { ...ad };
    const { data: assignments } = await supabase
      .from("ad_slot_assignments")
      .select("ad_slot, fill_section")
      .eq("ad_id", adId);
    try {
      await supabase.from("ad_slot_assignments").delete().eq("ad_id", adId);
      const { error } = await supabase.from("ads").delete().eq("id", adId);
      if (error) throw error;
      // If any slot now has only one ad, clear that ad's runtime (rotation no longer applies)
      const slotsToCheck = (assignments ?? []).map((a: { ad_slot: string }) => a.ad_slot);
      for (const slot of slotsToCheck) {
        const { data: remaining } = await supabase
          .from("ad_slot_assignments")
          .select("ad_id")
          .eq("ad_slot", slot);
        if (remaining?.length === 1) {
          await supabase.from("ads").update({ runtime_seconds: null }).eq("id", remaining[0].ad_id);
        }
      }
      loadAds();
      setSelectedAdId((prev) => (prev === adId ? null : prev));
      showToast("Ad deleted.", async () => {
        const { data: restored, error: insertErr } = await supabase
          .from("ads")
          .insert({
            title: adSnapshot.title,
            image_url: adSnapshot.image_url,
            link_url: adSnapshot.link_url,
            ad_slot: (adSnapshot.slots && adSnapshot.slots[0]) || adSnapshot.ad_slot || "",
            start_date: adSnapshot.start_date,
            end_date: adSnapshot.end_date,
            runtime_seconds: adSnapshot.runtime_seconds,
            display_order: adSnapshot.display_order,
            is_active: adSnapshot.is_active,
            fill_section: adSnapshot.fill_section ?? true,
            ad_label_color: adSnapshot.ad_label_color ?? null,
            ad_label_position: adSnapshot.ad_label_position ?? null,
            created_by: adSnapshot.created_by,
          })
          .select("id")
          .single();
        if (insertErr || !restored) return;
        if (assignments?.length) {
          await supabase.from("ad_slot_assignments").insert(
            assignments.map((a: any) => ({
              ad_id: restored.id,
              ad_slot: a.ad_slot,
              fill_section: a.fill_section ?? true,
            }))
          );
        }
        loadAds();
      });
    } catch (error: any) {
      showToast("Error deleting ad: " + error.message);
    }
  }

  async function handleDuplicateAd(ad: any) {
    if (!user) return;
    try {
      // Next display_order = max + 1 so duplicate appears after original in rotation (slot 2, 3, ...)
      const { data: maxRow } = await supabase
        .from("ads")
        .select("display_order")
        .order("display_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextOrder = (maxRow?.display_order ?? 0) + 1;

      const { data: newAd, error: insertError } = await supabase
        .from("ads")
        .insert({
          title: "Copy of " + (ad.title || "Untitled Ad"),
          image_url: ad.image_url,
          link_url: ad.link_url,
          ad_slot: (ad.slots && ad.slots[0]) || ad.ad_slot || "",
          start_date: ad.start_date,
          end_date: ad.end_date,
          runtime_seconds: ad.runtime_seconds,
          display_order: nextOrder,
          is_active: ad.is_active,
          fill_section: ad.fill_section ?? true,
          ad_label_color: (ad as { ad_label_color?: string | null }).ad_label_color ?? null,
          ad_label_position: (ad as { ad_label_position?: string | null }).ad_label_position ?? null,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: assignments } = await supabase
        .from("ad_slot_assignments")
        .select("ad_slot, fill_section")
        .eq("ad_id", ad.id);
      if (assignments?.length) {
        await supabase.from("ad_slot_assignments").insert(
          assignments.map((a) => ({
            ad_id: newAd.id,
            ad_slot: a.ad_slot,
            fill_section: a.fill_section ?? true,
          }))
        );
      }
      loadAds();
      const newAdId = newAd.id;
      showToast("Ad duplicated.", async () => {
        await supabase.from("ad_slot_assignments").delete().eq("ad_id", newAdId);
        await supabase.from("ads").delete().eq("id", newAdId);
        loadAds();
      });
    } catch (error: any) {
      showToast("Error duplicating ad: " + error.message);
    }
  }

  async function handleToggleActive(ad: Ad) {
    const previousActive = ad.is_active;
    try {
      const { error } = await supabase
        .from("ads")
        .update({ is_active: !ad.is_active })
        .eq("id", ad.id);

      if (error) throw error;
      loadAds();
      showToast(previousActive ? "Ad disabled." : "Ad enabled.", async () => {
        await supabase.from("ads").update({ is_active: previousActive }).eq("id", ad.id);
        loadAds();
      });
    } catch (error: any) {
      showToast("Error updating ad: " + error.message);
    }
  }

  function handleOpenModal(ad?: Ad & { slots?: string[]; slotSettings?: Record<string, { fill_section: boolean }> }) {
    if (ad) {
      setEditingAd(ad);
      const startYmd = formatYmdET(ad.start_date);
      const endYmd = formatYmdET(ad.end_date);
      const inferredMonths = inferCustomMonthCount(startYmd, endYmd);
      const campaignMonths = inferredMonths ?? 1;
      const rawPos = (ad as Ad & { ad_label_position?: string | null }).ad_label_position;
      const adLabelPos =
        rawPos === "bottom-right" ||
        rawPos === "bottom-left" ||
        rawPos === "top-right" ||
        rawPos === "top-left"
          ? rawPos
          : "";
      setFormData({
        title: ad.title || "",
        image_url: ad.image_url,
        link_url: ad.link_url,
        selectedSlots: (ad.slots || [ad.ad_slot].filter(Boolean)).filter(
          (s) => s !== UNASSIGNED_AD_SLOT
        ),
        start_date: startYmd,
        end_date: endYmd,
        campaignMonths,
        is_active: ad.is_active,
        fill_section: true,
        ad_label_color: (ad as Ad & { ad_label_color?: string | null }).ad_label_color || "",
        ad_label_position: adLabelPos,
      });
      // Load per-slot fill settings
      const fillSettings: Record<string, boolean> = {};
      (ad.slots || [ad.ad_slot].filter(Boolean))
        .filter((s) => s !== UNASSIGNED_AD_SLOT)
        .forEach((slot) => {
          fillSettings[slot] = ad.slotSettings?.[slot]?.fill_section ?? true;
        });
      setSlotFillSettings(fillSettings);
      setImagePreview(ad.image_url);
    } else {
      setEditingAd(null);
      const { dateStr } = getNowInEST();
      setFormData({
        title: "",
        image_url: "",
        link_url: "",
        selectedSlots: [],
        start_date: dateStr,
        end_date: endYmdAfterNCalendarMonths(dateStr, 1),
        campaignMonths: 1,
        is_active: true,
        fill_section: true,
        ad_label_color: "",
        ad_label_position: "",
      });
      setSlotFillSettings({});
      setImagePreview(null);
    }
    setShowModal(true);
  }

  function handleCloseModal() {
    setShowModal(false);
    setEditingAd(null);
    setImageFile(null);
    setImagePreview(null);
  }

  // Get current time in UTC (database stores times in UTC)
  // Compare directly with stored UTC times
  /** Current date and time in EST for defaulting new ad start */
  function getNowInEST() {
    const now = new Date();
    const dateFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const dateStr = dateFmt.format(now).replace(/\//g, "-"); // "YYYY-MM-DD"
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const timeStr = timeFmt.format(now); // "HH:MM"
    return { dateStr, timeStr };
  }

  function getAdStatus(ad: Ad): "scheduled" | "active" | "expired" {
    if (!ad.is_active) return "expired";
    
    const now = new Date(); // Current UTC time
    const start = new Date(ad.start_date); // Stored as UTC
    const end = new Date(ad.end_date); // Stored as UTC
    
    if (now < start) return "scheduled";
    if (now > end) return "expired";
    return "active";
  }

  // Filter and sort ads for the table
  const adSlots = ads.flatMap((ad: any) => ad.slots || (ad.ad_slot ? [ad.ad_slot] : []));
  const uniqueSections = Array.from(new Set(adSlots.filter((s) => s !== UNASSIGNED_AD_SLOT))).sort();
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredAds = useMemo(() => {
    return ads.filter((ad: any) => {
      const name = (ad.title || "Untitled Ad").toLowerCase();
      if (searchLower && !name.includes(searchLower)) return false;
      const slots: string[] = ad.slots || (ad.ad_slot ? [ad.ad_slot] : []);
      if (sectionFilter !== "all" && !slots.includes(sectionFilter)) return false;
      if (deviceFilter === "mobile" && !slots.some((s: string) => s.includes("mobile"))) return false;
      if (deviceFilter === "desktop" && !slots.some((s: string) => !s.includes("mobile"))) return false;
      return true;
    });
  }, [ads, searchLower, sectionFilter, deviceFilter]);
  /** Map each slot id to ads currently in that slot (for preview + remove) */
  const adsBySlot = useMemo(() => {
    const map: Record<string, { id: string; title: string }[]> = {};
    AD_SLOTS.forEach(({ value }) => {
      map[value] = [];
    });
    ads.forEach((ad: any) => {
      if (editingAd && ad.id === editingAd.id) return;
      const slots = ad.slots || (ad.ad_slot ? [ad.ad_slot] : []);
      const title = ad.title || "Untitled Ad";
      slots.forEach((s: string) => {
        if (s === UNASSIGNED_AD_SLOT) return;
        if (map[s]) map[s].push({ id: ad.id as string, title });
      });
    });
    return map;
  }, [ads, editingAd]);

  const sortedAds = useMemo(() => {
    return [...filteredAds].sort((a: any, b: any) => {
      if (sortBy === "name-az") return (a.title || "").localeCompare(b.title || "");
      if (sortBy === "name-za") return (b.title || "").localeCompare(a.title || "");
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      if (sortBy === "date-newest") return dateB - dateA;
      return dateA - dateB;
    });
  }, [filteredAds, sortBy]);

  useEffect(() => {
    setSelectedAdId((prev) => {
      if (!prev) return prev;
      return sortedAds.some((a: any) => a.id === prev) ? prev : null;
    });
  }, [sortedAds]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent" />
          <p className="mt-4 text-sm text-[var(--admin-text-muted)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  /** `admin-native-select`: globals.css — SVG chevron inset + no blue focus stack (see globals). */
  const filterSelectClass =
    "admin-native-select h-10 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] text-sm text-[var(--admin-text)] [color-scheme:dark] ring-offset-0 focus:border-[var(--admin-accent)] focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-[var(--admin-accent)] focus-visible:ring-1 focus-visible:ring-[var(--admin-accent)]";
  const sortSelectClass = `${filterSelectClass} sm:col-span-1`;

  const sectionFilterSelect = (
    <select
      value={sectionFilter}
      onChange={(e) => setSectionFilter(e.target.value)}
      className={filterSelectClass}
      aria-label="Filter by section"
    >
      <option value="all">All Sections</option>
      {uniqueSections.map((slot) => (
        <option key={slot} value={slot}>
          {getAdSlotTableLabel(slot)}
        </option>
      ))}
    </select>
  );

  const deviceFilterSelect = (
    <select
      value={deviceFilter}
      onChange={(e) => setDeviceFilter(e.target.value as "all" | "desktop" | "mobile")}
      className={filterSelectClass}
      aria-label="Filter by device"
    >
      <option value="all">All Devices</option>
      <option value="desktop">Desktop only</option>
      <option value="mobile">Mobile only</option>
    </select>
  );

  const selectedAd = selectedAdId
    ? sortedAds.find((a: any) => a.id === selectedAdId) ?? null
    : null;

  const adActionsSections =
    selectedAd
      ? [
          {
            title: "Actions",
            items: [
              {
                icon: (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                ),
                label: "Edit",
                onClick: () => handleOpenModal(selectedAd),
              },
              {
                icon: (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ),
                label: "Duplicate",
                onClick: () => handleDuplicateAd(selectedAd),
              },
              {
                icon: (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                ),
                label: selectedAd.is_active ? "Disable" : "Enable",
                onClick: () => handleToggleActive(selectedAd),
              },
              {
                icon: (
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ),
                label: "Delete",
                variant: "danger" as const,
                onClick: () => handleDeleteAd(selectedAd),
              },
            ],
          },
        ]
      : [
          {
            title: "Actions",
            customContent: (
              <p className="px-1 text-sm text-[var(--admin-text-muted)]">
                Select an ad in the table to edit, duplicate, enable or disable, or delete.
              </p>
            ),
          },
        ];

  const actionsPanel = (
    <AdminActionsPanel
      attachBelowCreateButton
      sections={[
        {
          title: "Filter",
          customContent: (
            <div className="space-y-2">
              {sectionFilterSelect}
              {deviceFilterSelect}
            </div>
          ),
        },
        ...adActionsSections,
      ]}
    />
  );

  return (
    <>
      <AdminPageHeader title="Ad Manager" />

      <AdminPageLayout
        createButton={{
          label: "Create Ad",
          onClick: () => handleOpenModal(),
        }}
        actionsColumnClassName="xl:pt-11"
        actionsPanel={actionsPanel}
      >

        {/* Search & sort — mobile: Filter + Actions card; xl+: filters in sidebar */}
        <h2 className="mb-4 text-xl font-semibold text-white">
          All Ads{" "}
          <span className="font-normal tabular-nums text-[var(--admin-text-muted)]">
            ({ads.length})
          </span>
        </h2>
        <div className="mb-4 w-full max-w-md overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-card-bg)] xl:hidden">
          <div className="border-b border-[var(--admin-border)] p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--admin-text-muted)]">
              Filter
            </h3>
            <div className="space-y-2">
              {sectionFilterSelect}
              {deviceFilterSelect}
            </div>
          </div>
          <AdminActionsPanel embedded sections={adActionsSections} />
        </div>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input
            type="search"
            placeholder="Search by ad name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 min-w-0 rounded-md border border-[var(--admin-border)] bg-[var(--admin-card-bg)] px-3 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-muted)] focus:border-[var(--admin-accent)] focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-[var(--admin-accent)] focus-visible:ring-1 focus-visible:ring-[var(--admin-accent)] sm:col-span-2"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className={sortSelectClass}
            aria-label="Sort ads"
          >
            <option value="date-newest">Sort: Date (newest)</option>
            <option value="date-oldest">Sort: Date (oldest)</option>
            <option value="name-az">Sort: Name (A-Z)</option>
            <option value="name-za">Sort: Name (Z-A)</option>
          </select>
        </div>

        {/* Ads Table */}
        <div className="bg-[var(--admin-card-bg)] rounded-lg border border-[var(--admin-border)] overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-0 table-auto">
            <colgroup>
              <col className="w-0" />
              <col />
              <col className="w-0" />
            </colgroup>
            <thead className="bg-[var(--admin-table-header-bg)]">
              <tr>
                <th className="w-0 px-3 py-3 text-left text-xs font-semibold text-[var(--admin-text)]">
                  Ad
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--admin-text)]">
                  Slots
                </th>
                <th className="w-0 whitespace-nowrap px-3 py-3 text-right text-xs font-semibold text-[var(--admin-text)]">
                  Schedule
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAds.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                    {ads.length === 0 ? "No ads yet." : "No ads match your search or filters."}
                  </td>
                </tr>
              ) : (
                sortedAds.map((ad: any) => (
                <tr
                  key={ad.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setSelectedAdId((prev) => (prev === ad.id ? null : ad.id))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedAdId((prev) => (prev === ad.id ? null : ad.id));
                    }
                  }}
                  className={`border-t border-[var(--admin-border)] cursor-pointer transition ${
                    selectedAdId === ad.id
                      ? "bg-[var(--admin-accent)]/10"
                      : "hover:bg-[var(--admin-table-row-hover)]"
                  }`}
                >
                  <td className="w-0 px-3 py-3 align-middle">
                    <AdTableThumb
                      imageUrl={ad.image_url}
                      title={ad.title || "Untitled Ad"}
                      status={getAdStatus(ad)}
                    />
                  </td>
                  <td className="min-w-0 px-3 py-3 align-middle text-[var(--admin-text)]">
                    <div className="ml-auto w-max max-w-[min(100%,22rem)] text-left">
                      <AdSlotsText slots={(ad.slots || [ad.ad_slot].filter(Boolean)) as string[]} />
                    </div>
                  </td>
                  <td className="w-0 whitespace-nowrap px-3 py-3 align-middle text-right">
                    <AdScheduleCell
                      startDate={ad.start_date}
                      endDate={ad.end_date}
                      formatDate={formatAdScheduleDate}
                    />
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
          </div>

          {ads.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--admin-text-muted)]">
              No ads found. Create your first ad!
            </div>
          )}
        </div>

      {/* Enhanced Create/Edit Ad Modal with Split Screen */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="relative flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Side - Editor (no scroll; compact layout) */}
              <div className="flex min-h-0 min-w-0 w-1/2 flex-col overflow-hidden rounded-l-lg border-r border-gray-200 bg-white">
                <div className="flex min-h-0 flex-1 flex-col px-5 pt-3 pb-3">
                  <h2 className="mb-2 shrink-0 text-xl font-semibold text-[color:var(--color-dark)]">
                    {editingAd ? "Edit Ad" : "Create New Ad"}
                  </h2>

                  <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
                    <div className="shrink-0 space-y-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-stretch sm:gap-x-4">
                        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            Image
                          </p>
                          <div className="flex min-h-[7.75rem] w-full flex-1 flex-col sm:min-h-0">
                            {imagePreview || formData.image_url ? (
                              <div className="group relative flex min-h-[5rem] flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-gray-50 sm:min-h-0">
                                <img
                                  src={imagePreview || formData.image_url}
                                  alt=""
                                  className="block h-full min-h-0 w-full flex-1 object-contain object-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="absolute left-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-gray-700 opacity-0 shadow ring-1 ring-gray-200 transition hover:bg-white group-hover:opacity-100"
                                  aria-label="Change image"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setImagePreview(null);
                                    setImageFile(null);
                                    setFormData({ ...formData, image_url: "" });
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                  }}
                                  className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow hover:bg-red-600"
                                  aria-label="Remove image"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="group relative flex min-h-[5rem] w-full flex-1 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-gray-400 hover:bg-gray-100"
                                aria-label="Choose image"
                              >
                                <span className="rounded-full bg-white p-2 opacity-0 shadow ring-1 ring-gray-200 transition group-hover:opacity-100">
                                  <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </span>
                              </button>
                            )}
                          </div>
                          {!imagePreview && !formData.image_url && (
                            <input
                              type="text"
                              value={formData.image_url}
                              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                              placeholder="Paste image URL"
                              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                            />
                          )}
                        </div>

                        <div className="flex h-full min-h-0 min-w-0 flex-col gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            Advertisement label
                          </p>
                          <div className="relative min-w-0 w-full">
                            <select
                              value={formData.ad_label_position}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  ad_label_position: e.target.value as
                                    | ""
                                    | "bottom-right"
                                    | "bottom-left"
                                    | "top-right"
                                    | "top-left",
                                })
                              }
                              className={`h-11 w-full min-w-0 cursor-pointer appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-10 text-sm scheme-light ${
                                formData.ad_label_position ? "text-gray-900" : "text-gray-600"
                              }`}
                            >
                              <option value="">Select position</option>
                              <option value="bottom-right">Bottom right</option>
                              <option value="bottom-left">Bottom left</option>
                              <option value="top-right">Top right</option>
                              <option value="top-left">Top left</option>
                            </select>
                            <span
                              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500"
                              aria-hidden
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </span>
                          </div>
                          <div className="w-full min-w-0">
                            <label
                              htmlFor="ad-form-label-color"
                              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500"
                            >
                              Label color
                            </label>
                            <input
                              id="ad-form-label-color"
                              type="color"
                              title="Label color"
                              className="h-11 w-full min-w-0 cursor-pointer overflow-hidden rounded-md border border-gray-300 bg-white p-0 [appearance:none] [&::-webkit-color-swatch-wrapper]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-sm [&::-moz-color-swatch]:border-0"
                              value={
                                formData.ad_label_color && /^#[0-9A-Fa-f]{6}$/.test(formData.ad_label_color)
                                  ? formData.ad_label_color
                                  : "#9ca3af"
                              }
                              onChange={(e) => setFormData({ ...formData, ad_label_color: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          htmlFor="ad-form-title"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500"
                        >
                          Title
                        </label>
                        <input
                          id="ad-form-title"
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="ad-form-link"
                          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500"
                        >
                          Link
                        </label>
                        <input
                          id="ad-form-link"
                          type="url"
                          value={formData.link_url}
                          onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                          className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400"
                          placeholder="https://…"
                          required
                        />
                      </div>
                    </div>

                    <div className="shrink-0">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                        Ad positioning
                      </p>
                      {formData.selectedSlots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formData.selectedSlots.map((slot) => (
                            <div
                              key={slot}
                              className="flex items-center gap-1.5 rounded-md border border-gray-600 bg-gray-600 px-2.5 py-1.5 text-xs text-white"
                            >
                              <span className="truncate font-medium text-white">{getAdSlotTableLabel(slot)}</span>
                              <button
                                type="button"
                                onClick={() => handleSlotClick(slot)}
                                className="shrink-0 rounded px-1 text-base leading-none text-white/85 transition hover:bg-white/15 hover:text-white"
                                aria-label={`Remove ${getAdSlotTableLabel(slot)}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Choose a placement in the preview →
                        </p>
                      )}
                    </div>

                    <div className="min-h-0 shrink-0">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6">
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            Campaign length
                          </p>
                          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Campaign length">
                            <input
                              type="number"
                              min={1}
                              max={120}
                              value={formData.campaignMonths}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                  setFormData({ ...formData, campaignMonths: 1 });
                                  return;
                                }
                                const v = parseInt(raw, 10);
                                setFormData({
                                  ...formData,
                                  campaignMonths: Number.isFinite(v) ? Math.min(120, Math.max(1, v)) : 1,
                                });
                              }}
                              className="h-11 w-20 rounded-md border border-gray-300 bg-white px-3 text-center text-sm tabular-nums text-gray-900"
                              aria-label="Number of months"
                            />
                            <span className="text-sm font-medium text-gray-700">Months</span>
                          </div>
                        </div>
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                            Start date
                          </p>
                          <input
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                            className="h-11 w-full min-w-0 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900"
                            required
                          />
                        </div>
                      </div>
                      {formData.start_date && formData.end_date && (
                        <p className="mt-3 text-sm text-gray-700">
                          The campaign ends on{" "}
                          {new Date(`${formData.end_date}T12:00:00`).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 px-5 py-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="shrink-0 rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAd}
                    className="min-w-0 flex-1 rounded-md bg-[var(--admin-accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-opacity-90"
                  >
                    {editingAd ? "Update ad" : "Add ad"}
                  </button>
                </div>
              </div>

              {/* Right Side - Preview */}
              <div className="flex min-h-0 w-1/2 flex-col rounded-r-lg bg-[var(--admin-card-bg)] p-6">
                <h3 className="mb-4 text-lg font-semibold text-[var(--admin-text)]">Preview</h3>
                <div className="flex-1 min-h-0">
                  <AdPreview
                    selectedSlots={formData.selectedSlots}
                    onSlotClick={handleSlotClick}
                    onRemoveAdFromSlot={handleRemoveAdFromSlot}
                    previewAd={
                      (formData.image_url || imagePreview)
                        ? {
                            image_url: formData.image_url || imagePreview || "",
                            title: formData.title,
                          }
                        : undefined
                    }
                    adsBySlot={adsBySlot}
                    currentTab={previewTab}
                    onTabChange={setPreviewTab}
                  />
                </div>
                {formData.selectedSlots.length > 0 && (() => {
                  const othersInSection = ads.filter(
                    (a: any) =>
                      (editingAd ? a.id !== editingAd.id : true) &&
                      (a.slots || (a.ad_slot ? [a.ad_slot] : [])).some((s: string) =>
                        formData.selectedSlots.includes(s)
                      )
                  );
                  if (othersInSection.length === 0) return null;
                  return (
                    <p className="mt-3 border-t border-[var(--admin-border)] pt-3 text-xs text-[var(--admin-text-muted)]">
                      Also in this section:{" "}
                      {othersInSection.map((a: any) => a.title || "Untitled Ad").join(", ")}
                    </p>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app toast: action completed, 10s timer, Ok / Undo */}
      {toast && (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"
          role="status"
          aria-live="polite"
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden">
            <p className="text-sm text-[color:var(--color-dark)] px-4 pt-3 pb-2">
              {toast.message}
            </p>
            <div className="flex justify-end gap-2 px-4 pb-2">
              <button
                type="button"
                onClick={() => {
                  toast.onUndo?.();
                  dismissToast();
                }}
                className="text-xs font-semibold text-[var(--admin-accent)] hover:underline"
              >
                {toast.onUndo ? "Undo" : "Ok"}
              </button>
              {toast.onUndo && (
                <button
                  type="button"
                  onClick={dismissToast}
                  className="text-xs font-semibold text-gray-600 hover:underline"
                >
                  Ok
                </button>
              )}
            </div>
            <div
              className="h-1 bg-[var(--admin-accent)] opacity-30 transition-all duration-300"
              style={{ width: `${(toastSecondsLeft / 10) * 100}%` }}
            />
          </div>
        </div>
      )}
      </AdminPageLayout>
    </>
  );
}
