"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdPreview } from "@/components/AdPreview";
import type { Ad, AdSetting, AdSlotAssignment } from "@/lib/types/database";

const AD_SLOTS = [
  // Homepage slots (numbered)
  { value: "homepage-banner-top", label: "Section 1: Banner Below Hero" },
  { value: "homepage-banner-top-mobile", label: "Mobile Section 1: Below Hero" },
  { value: "homepage-mobile-above-most-read", label: "Mobile Section 2: Above Most Read" },
  { value: "homepage-mobile-above-editors-picks", label: "Mobile Section 3: Above Editor’s Picks" },
  { value: "homepage-mobile-between-editors-picks-footer", label: "Mobile Section 4: Between Editor’s Picks & Footer" },
  { value: "homepage-sidebar-top", label: "Section 2: Sidebar Top (Above Trending)" },
  { value: "homepage-sidebar-middle", label: "Section 3: Sidebar Middle" },
  { value: "homepage-sidebar-bottom", label: "Section 4: Sidebar Bottom" },
  { value: "homepage-content-top", label: "Section 5: Main Content Top" },
  { value: "homepage-content-middle-1", label: "Section 6: Main Content Middle 1" },
  { value: "homepage-content-middle-2", label: "Section 7: Main Content Middle 2" },
  { value: "homepage-banner-bottom", label: "Section 8: Banner Bottom" },
  // Article page slots
  { value: "article-sidebar-top", label: "Article: Sidebar Top (Static)" },
  { value: "article-sidebar-bottom", label: "Article: Sidebar Bottom (Sticky)" },
  { value: "article-inline-1", label: "Article: Inline Ad 1" },
  { value: "article-inline-2", label: "Article: Inline Ad 2" },
  { value: "article-mobile-inline", label: "Article Mobile Section 1: Between Content Blocks" },
  { value: "article-mobile-end", label: "Article Mobile Section 2: End of Article" },
  { value: "article-mobile-below-tags", label: "Article Mobile Section 3: Below Tags" },
];

export default function AdsManagerPage() {
  const [user, setUser] = useState<any>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [adSettings, setAdSettings] = useState<AdSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
    start_time: "",
    end_date: "",
    end_time: "",
    runtime_seconds: null as number | null,
    display_order: 0,
    is_active: true,
    fill_section: true, // Default to fill section
    ad_label_color: "", // Hex for "Advertisement" label (empty = default gray)
    ad_label_position: "bottom-right" as "bottom-right" | "bottom-left" | "top-right" | "top-left",
  });
  // Per-slot fill section settings
  const [slotFillSettings, setSlotFillSettings] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [runtimeRequired, setRuntimeRequired] = useState(false);
  const [previewTab, setPreviewTab] = useState<
    "homepage-desktop" | "homepage-mobile" | "article-desktop" | "article-mobile"
  >("homepage-desktop");

  // Modal: set run times for all ads in the selected slot(s) before saving
  const [showRuntimeModal, setShowRuntimeModal] = useState(false);
  const [runtimeModalAds, setRuntimeModalAds] = useState<
    { adId: string | null; title: string; runtime_seconds: number | null }[]
  >([]);

  // Search, sort, filter for ad list
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name-az" | "name-za" | "date-newest" | "date-oldest">("date-newest");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [deviceFilter, setDeviceFilter] = useState<"all" | "desktop" | "mobile">("all");

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

  // Lock body scroll when any modal (create/edit ad, runtime, settings) is open
  useEffect(() => {
    const open = showModal || showRuntimeModal || showSettingsModal;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showModal, showRuntimeModal, showSettingsModal]);

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

  // Check if runtime is required (multiple ads in same slot)
  useEffect(() => {
    async function checkRuntimeRequirement() {
      if (formData.selectedSlots.length === 0) {
        setRuntimeRequired(false);
        return;
      }

      // Check each selected slot for existing active ads
      for (const slot of formData.selectedSlots) {
        const now = new Date().toISOString();
        const { data: existingAds } = await supabase
          .from("ad_slot_assignments")
          .select("ad_id, ads!inner(id, is_active, start_date, end_date)")
          .eq("ad_slot", slot);

        if (existingAds) {
          const activeAds = existingAds.filter((assignment: any) => {
            const ad = assignment.ads;
            return (
              ad.is_active &&
              new Date(ad.start_date) <= new Date(now) &&
              new Date(ad.end_date) >= new Date(now)
            );
          });

          // If editing, exclude current ad from count
          const activeCount = editingAd
            ? activeAds.filter((a: any) => a.ads.id !== editingAd.id).length
            : activeAds.length;

          if (activeCount > 0) {
            setRuntimeRequired(true);
            return;
          }
        }
      }
      setRuntimeRequired(false);
    }

    checkRuntimeRequirement();
  }, [formData.selectedSlots, editingAd, supabase]);

  // When creating a new ad and user selects slot(s), default display_order to next in those sections
  useEffect(() => {
    if (editingAd || formData.selectedSlots.length === 0) return;
    const adsInSelectedSlots = ads.filter((ad: any) =>
      (ad.slots || (ad.ad_slot ? [ad.ad_slot] : [])).some((s: string) =>
        formData.selectedSlots.includes(s)
      )
    );
    const maxOrder = Math.max(0, ...adsInSelectedSlots.map((a: any) => a.display_order ?? 0));
    const nextOrder = maxOrder + 1;
    if (nextOrder !== formData.display_order) {
      setFormData((f) => ({ ...f, display_order: nextOrder }));
    }
  }, [formData.selectedSlots, editingAd, ads]);

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
      router.push("/admin");
      return;
    }

    setUser(currentUser);
    setIsSuperAdmin(true);
    loadAds();
    loadAdSettings();
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

  async function loadAdSettings() {
    const { data } = await supabase
      .from("ad_settings")
      .select("*")
      .order("ad_slot", { ascending: true });

    if (data) {
      setAdSettings(data);
    }
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

  /** Performs image upload, saves main ad (create/update) with currentRuntime, then updates other ads' runtime_seconds. */
  async function doSaveAd(
    startDateTime: string,
    endDateTime: string,
    currentRuntime: number | null,
    otherAdRuntimes: { adId: string; runtime_seconds: number }[]
  ): Promise<void> {
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

    if (editingAd) {
      const { error: updateError } = await supabase
        .from("ads")
        .update({
          title: formData.title || null,
          image_url: finalImageUrl,
          link_url: formData.link_url,
          start_date: startDateTime,
          end_date: endDateTime,
          runtime_seconds: currentRuntime,
          display_order: formData.display_order,
          is_active: formData.is_active,
          fill_section: true,
          ad_label_color: formData.ad_label_color?.trim() || null,
          ad_label_position: formData.ad_label_position || null,
        })
        .eq("id", editingAd.id);
      if (updateError) throw updateError;
      await supabase.from("ad_slot_assignments").delete().eq("ad_id", editingAd.id);
      const assignments = formData.selectedSlots.map((slot) => ({
        ad_id: editingAd.id,
        ad_slot: slot,
        fill_section: true,
      }));
      const { error: assignError } = await supabase.from("ad_slot_assignments").insert(assignments);
      if (assignError) throw assignError;
    } else {
      const { data: newAd, error: insertError } = await supabase
        .from("ads")
        .insert({
          title: formData.title || null,
          image_url: finalImageUrl,
          link_url: formData.link_url,
          ad_slot: formData.selectedSlots[0],
          start_date: startDateTime,
          end_date: endDateTime,
          runtime_seconds: currentRuntime,
          display_order: formData.display_order,
          is_active: formData.is_active,
          fill_section: true,
          ad_label_color: formData.ad_label_color?.trim() || null,
          ad_label_position: formData.ad_label_position || null,
          created_by: user.id,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      const assignments = formData.selectedSlots.map((slot) => ({
        ad_id: newAd.id,
        ad_slot: slot,
        fill_section: true,
      }));
      const { error: assignError } = await supabase.from("ad_slot_assignments").insert(assignments);
      if (assignError) throw assignError;
    }

    for (const { adId, runtime_seconds } of otherAdRuntimes) {
      const { error } = await supabase.from("ads").update({ runtime_seconds }).eq("id", adId);
      if (error) throw error;
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

    if (formData.selectedSlots.length === 0) {
      showToast("Please select at least one ad slot.");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      showToast("Please set start and end dates.");
      return;
    }

    const startDateTime = parseETDateTime(formData.start_date, formData.start_time || "00:00 AM");
    const endDateTime = parseETDateTime(formData.end_date, formData.end_time || "11:59 PM");

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      showToast("End date/time must be after start date/time.");
      return;
    }

    if (runtimeRequired) {
      // Open modal to set run times for this ad and all others in the slot(s)
      const adIdsInSlots = new Set<string>();
      for (const slot of formData.selectedSlots) {
        const { data: assignments } = await supabase
          .from("ad_slot_assignments")
          .select("ad_id")
          .eq("ad_slot", slot);
        assignments?.forEach((a: { ad_id: string }) => adIdsInSlots.add(a.ad_id));
      }
      if (editingAd) adIdsInSlots.delete(editingAd.id);
      const otherAdIds = Array.from(adIdsInSlots);
      const { data: otherAds } = otherAdIds.length
        ? await supabase.from("ads").select("id, title, runtime_seconds").in("id", otherAdIds)
        : { data: [] };
      const currentRow = {
        adId: null as string | null,
        title: formData.title || "Untitled Ad",
        runtime_seconds: formData.runtime_seconds,
      };
      const otherRows = (otherAds || []).map((a: any) => ({
        adId: a.id as string,
        title: a.title || "Untitled Ad",
        runtime_seconds: a.runtime_seconds ?? null,
      }));
      setRuntimeModalAds([currentRow, ...otherRows]);
      setShowRuntimeModal(true);
      return;
    }

    // Validate display order (1-20)
    if (formData.display_order < 1 || formData.display_order > 20) {
      showToast("Display order must be between 1 and 20.");
      return;
    }

    try {
      await doSaveAd(startDateTime, endDateTime, formData.runtime_seconds, []);
      loadAds();
      handleCloseModal();
      showToast(editingAd ? "Ad updated." : "Ad created.");
    } catch (error: any) {
      showToast("Error saving ad: " + (error?.message ?? String(error)));
    }
  }

  async function handleRuntimeModalConfirm() {
    const invalid = runtimeModalAds.some((r) => r.runtime_seconds == null || r.runtime_seconds < 1);
    if (invalid) {
      showToast("Set a runtime (seconds) of 1 or more for every ad in this slot.");
      return;
    }
    const startDateTime = parseETDateTime(formData.start_date, formData.start_time || "00:00 AM");
    const endDateTime = parseETDateTime(formData.end_date, formData.end_time || "11:59 PM");
    const currentRuntime = runtimeModalAds[0]!.runtime_seconds!;
    const otherAdRuntimes = runtimeModalAds.slice(1).filter((r) => r.adId != null).map((r) => ({ adId: r.adId!, runtime_seconds: r.runtime_seconds! }));
    try {
      await doSaveAd(startDateTime, endDateTime, currentRuntime, otherAdRuntimes);
      loadAds();
      handleCloseModal();
      setShowRuntimeModal(false);
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

  async function handleUpdateSetting(setting: AdSetting, useFallback: boolean) {
    try {
      const { error } = await supabase
        .from("ad_settings")
        .update({
          use_fallback: useFallback,
          updated_by: user.id,
        })
        .eq("id", setting.id);

      if (error) throw error;
      loadAdSettings();
      showToast("Setting updated.");
    } catch (error: any) {
      showToast("Error updating setting: " + error.message);
    }
  }

  function handleOpenModal(ad?: Ad & { slots?: string[]; slotSettings?: Record<string, { fill_section: boolean }> }) {
    if (ad) {
      setEditingAd(ad);
      const startDate = new Date(ad.start_date);
      const endDate = new Date(ad.end_date);
      setFormData({
        title: ad.title || "",
        image_url: ad.image_url,
        link_url: ad.link_url,
        selectedSlots: ad.slots || [ad.ad_slot].filter(Boolean),
        start_date: startDate.toISOString().split("T")[0],
        start_time: startDate.toTimeString().slice(0, 5),
        end_date: endDate.toISOString().split("T")[0],
        end_time: endDate.toTimeString().slice(0, 5),
        runtime_seconds: ad.runtime_seconds,
        display_order: ad.display_order || 0,
        is_active: ad.is_active,
        fill_section: true,
        ad_label_color: (ad as Ad & { ad_label_color?: string | null }).ad_label_color || "",
        ad_label_position: (ad as Ad & { ad_label_position?: string | null }).ad_label_position || "bottom-right",
      });
      // Load per-slot fill settings
      const fillSettings: Record<string, boolean> = {};
      (ad.slots || [ad.ad_slot].filter(Boolean)).forEach((slot) => {
        fillSettings[slot] = ad.slotSettings?.[slot]?.fill_section ?? true;
      });
      setSlotFillSettings(fillSettings);
      setImagePreview(ad.image_url);
    } else {
      setEditingAd(null);
      const { dateStr, timeStr } = getNowInEST();
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowFmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const endDateStr = tomorrowFmt.format(tomorrow).replace(/\//g, "-");
      setFormData({
        title: "",
        image_url: "",
        link_url: "",
        selectedSlots: [],
        start_date: dateStr,
        start_time: timeStr,
        end_date: endDateStr,
        end_time: "23:59",
        runtime_seconds: null,
        display_order: 1,
        is_active: true,
        fill_section: true,
        ad_label_color: "",
        ad_label_position: "bottom-right",
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

  function getSlotLabel(slot: string) {
    return AD_SLOTS.find((s) => s.value === slot)?.label || slot;
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

  function isAdActive(ad: Ad) {
    return getAdStatus(ad) === "active";
  }

  // Filter and sort ads for the table
  const adSlots = ads.flatMap((ad: any) => ad.slots || (ad.ad_slot ? [ad.ad_slot] : []));
  const uniqueSections = Array.from(new Set(adSlots)).sort();
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredAds = ads.filter((ad: any) => {
    const name = (ad.title || "Untitled Ad").toLowerCase();
    if (searchLower && !name.includes(searchLower)) return false;
    const slots: string[] = ad.slots || (ad.ad_slot ? [ad.ad_slot] : []);
    if (sectionFilter !== "all" && !slots.includes(sectionFilter)) return false;
    if (deviceFilter === "mobile" && !slots.some((s: string) => s.includes("mobile"))) return false;
    if (deviceFilter === "desktop" && !slots.some((s: string) => !s.includes("mobile"))) return false;
    return true;
  });
  /** Map each slot id to list of ad titles currently in that slot (for preview) */
  const adsBySlot = useMemo(() => {
    const map: Record<string, string[]> = {};
    AD_SLOTS.forEach(({ value }) => {
      map[value] = [];
    });
    ads.forEach((ad: any) => {
      const slots = ad.slots || (ad.ad_slot ? [ad.ad_slot] : []);
      const title = ad.title || "Untitled Ad";
      slots.forEach((s: string) => {
        if (map[s]) map[s].push(title);
      });
    });
    return map;
  }, [ads]);

  const sortedAds = [...filteredAds].sort((a: any, b: any) => {
    if (sortBy === "name-az") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "name-za") return (b.title || "").localeCompare(a.title || "");
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    if (sortBy === "date-newest") return dateB - dateA;
    return dateA - dateB;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--color-surface)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[color:var(--color-riviera-blue)] border-r-transparent"></div>
          <p className="mt-2 text-sm text-[color:var(--color-medium)]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <header className="border-b border-[color:var(--color-border)] bg-white">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[color:var(--color-dark)]">Ad Manager</h1>
              <p className="text-sm text-[color:var(--color-medium)]">Super Admin Only</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-dark)] hover:bg-gray-50"
              >
                Settings
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="rounded-full bg-[color:var(--color-riviera-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-opacity-90"
              >
                + New Ad
              </button>
              <Link
                href="/admin"
                className="rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-dark)] hover:bg-gray-50"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-3 mb-6 md:grid-cols-4">
          <div className="rounded-lg bg-blue-50 text-blue-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Total Ads</p>
            <p className="text-2xl font-bold mt-1">{ads.length}</p>
          </div>
          <div className="rounded-lg bg-green-50 text-green-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Active Ads</p>
            <p className="text-2xl font-bold mt-1">
              {ads.filter((ad) => isAdActive(ad)).length}
            </p>
          </div>
          <div className="rounded-lg bg-yellow-50 text-yellow-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Scheduled</p>
            <p className="text-2xl font-bold mt-1">
              {ads.filter((ad) => getAdStatus(ad) === "scheduled").length}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 text-red-700 p-3 border border-gray-200">
            <p className="text-xs font-medium opacity-80">Expired</p>
            <p className="text-2xl font-bold mt-1">
              {ads.filter((ad) => getAdStatus(ad) === "expired").length}
            </p>
          </div>
        </div>

        {/* Search, sort, filter */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="search"
            placeholder="Search by ad name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm text-[color:var(--color-dark)] placeholder:text-gray-500 focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
          />
          <div className="flex items-center gap-2">
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-[color:var(--color-dark)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
            >
              <option value="all">All sections</option>
              {uniqueSections.map((slot) => (
                <option key={slot} value={slot}>
                  {AD_SLOTS.find((s) => s.value === slot)?.label ?? slot}
                </option>
              ))}
            </select>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as "all" | "desktop" | "mobile")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-[color:var(--color-dark)] focus:border-[color:var(--color-riviera-blue)] focus:outline-none focus:ring-1 focus:ring-[color:var(--color-riviera-blue)]"
            >
              <option value="all">All devices</option>
              <option value="desktop">Desktop only</option>
              <option value="mobile">Mobile only</option>
            </select>
            <div className="flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-[color:var(--color-dark)]">
              <span className="text-gray-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="border-0 bg-transparent font-medium focus:outline-none focus:ring-0"
              >
                <option value="date-newest">Date (newest)</option>
                <option value="date-oldest">Date (oldest)</option>
                <option value="name-az">Name (A–Z)</option>
                <option value="name-za">Name (Z–A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ads Table */}
        <div className="bg-white rounded-lg border border-[color:var(--color-border)] overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Ad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Slots</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Schedule</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[color:var(--color-dark)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[color:var(--color-medium)]">
                    {ads.length === 0 ? "No ads yet." : "No ads match your search or filters."}
                  </td>
                </tr>
              ) : (
                sortedAds.map((ad: any) => (
                <tr key={ad.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-4 py-3 w-64">
                    <div className="flex items-center gap-3">
                      <img
                        src={ad.image_url}
                        alt={ad.title || "Ad"}
                        className="w-16 h-16 object-cover rounded flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-[color:var(--color-dark)] truncate">
                          {ad.title || "Untitled Ad"}
                        </div>
                        <a
                          href={ad.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[color:var(--color-riviera-blue)] hover:underline truncate block"
                        >
                          {ad.link_url}
                        </a>
                        {ad.runtime_seconds && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Runtime: {ad.runtime_seconds}s
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-medium)]">
                    <div className="flex flex-wrap gap-1 max-w-md">
                      {(ad.slots || [ad.ad_slot].filter(Boolean)).map((slot: string) => (
                        <span
                          key={slot}
                          className="inline-flex rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold whitespace-nowrap"
                        >
                          {getSlotLabel(slot)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {(() => {
                      const status = getAdStatus(ad);
                      if (status === "active") {
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-xs font-semibold">
                            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                            Active
                          </span>
                        );
                      } else if (status === "scheduled") {
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-semibold">
                            Scheduled
                          </span>
                        );
                      } else {
                        return (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-semibold">
                            Expired
                          </span>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-medium)]">
                    <div className="text-xs">
                      <div>
                        Publish:{" "}
                        {new Date(ad.start_date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                      <div>
                        Expires:{" "}
                        {new Date(ad.end_date).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(ad)}
                        className="text-xs font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
                      >
                        Edit
                      </button>
                      <span className="text-[color:var(--color-medium)]">|</span>
                      <button
                        onClick={() => handleDuplicateAd(ad)}
                        className="text-xs font-semibold text-[color:var(--color-dark)] hover:underline"
                      >
                        Duplicate
                      </button>
                      <span className="text-[color:var(--color-medium)]">|</span>
                      <button
                        onClick={() => handleToggleActive(ad)}
                        className={`text-xs font-semibold hover:underline ${
                          ad.is_active ? "text-yellow-600" : "text-green-600"
                        }`}
                      >
                        {ad.is_active ? "Disable" : "Enable"}
                      </button>
                      <span className="text-[color:var(--color-medium)]">|</span>
                      <button
                        onClick={() => handleDeleteAd(ad)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>

          {ads.length === 0 && (
            <div className="py-12 text-center text-sm text-[color:var(--color-medium)]">
              No ads found. Create your first ad!
            </div>
          )}
        </div>
      </main>

      {/* Enhanced Create/Edit Ad Modal with Split Screen */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col relative">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-10 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex-1 flex overflow-hidden">
              {/* Left Side - Editor */}
              <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6">
                <h2 className="text-2xl font-bold text-[color:var(--color-dark)] mb-6">
                  {editingAd ? "Edit Ad" : "Create New Ad"}
                </h2>

                <div className="space-y-4">
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                      Ad Image *
                    </label>
                    {imagePreview && (
                      <div className="mb-2 relative inline-block">
                        <img src={imagePreview} alt="Preview" className="max-w-full h-32 object-contain rounded" />
                        <div className="absolute top-0 right-0 flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview(null);
                              setImageFile(null);
                              setFormData({ ...formData, image_url: "" });
                              if (fileInputRef.current) {
                                fileInputRef.current.value = "";
                              }
                            }}
                            className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition"
                            aria-label="Remove image"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-200"
                      >
                        Choose Image
                      </button>
                      {imageFile && (
                        <button
                          type="button"
                          onClick={handleUploadImage}
                          className="px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md text-sm font-semibold hover:bg-opacity-90"
                        >
                          Upload
                        </button>
                      )}
                      {!imagePreview && (
                        <input
                          type="text"
                          value={formData.image_url}
                          onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                          placeholder="Or enter image URL"
                          className="flex-1 border border-gray-300 rounded-md px-4 py-2 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                      placeholder="Ad title"
                    />
                  </div>

                  {/* Link URL */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                      Link URL *
                    </label>
                    <input
                      type="url"
                      value={formData.link_url}
                      onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                      placeholder="https://example.com"
                      required
                    />
                  </div>

                  {/* Advertisement label color */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                      Advertisement label color
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Color of the &quot;Advertisement&quot; text on this ad. Leave empty for default gray (good for light backgrounds).
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.ad_label_color && /^#[0-9A-Fa-f]{6}$/.test(formData.ad_label_color) ? formData.ad_label_color : "#6b7280"}
                        onChange={(e) => setFormData({ ...formData, ad_label_color: e.target.value })}
                        className="h-10 w-14 cursor-pointer rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={formData.ad_label_color}
                        onChange={(e) => setFormData({ ...formData, ad_label_color: e.target.value })}
                        className="flex-1 border border-gray-300 rounded-md px-4 py-2 font-mono text-sm"
                        placeholder="#6b7280 or leave empty for default"
                      />
                    </div>
                  </div>

                  {/* Advertisement label position */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                      Advertisement label position
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Where the &quot;Advertisement&quot; tag appears on the ad (default: bottom right).
                    </p>
                    <select
                      value={formData.ad_label_position}
                      onChange={(e) => setFormData({ ...formData, ad_label_position: e.target.value as "bottom-right" | "bottom-left" | "top-right" | "top-left" })}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                    >
                      <option value="bottom-right">Bottom right</option>
                      <option value="bottom-left">Bottom left</option>
                      <option value="top-right">Top right</option>
                      <option value="top-left">Top left</option>
                    </select>
                  </div>

                  {/* Selected Slots Display */}
                  {formData.selectedSlots.length > 0 && (
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                        Selected Ad Slots
                      </label>
                      <div className="space-y-3">
                        {formData.selectedSlots.map((slot) => (
                          <div
                            key={slot}
                            className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200"
                          >
                            <span className="text-sm font-semibold text-blue-700">
                              {getSlotLabel(slot)}
                            </span>
                            <button
                              onClick={() => handleSlotClick(slot)}
                              className="text-blue-700 hover:text-blue-900 font-bold"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Runtime (if required) */}
                  {runtimeRequired && (
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                        Runtime (seconds) *
                        <span className="text-xs text-yellow-600 ml-2">
                          Required: Multiple ads in same slot
                        </span>
                      </label>
                      <input
                        type="number"
                        value={formData.runtime_seconds || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            runtime_seconds: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        className="w-full border border-gray-300 rounded-md px-4 py-2"
                        placeholder="e.g., 10"
                        min="1"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        How long this ad should display before rotating to the next one
                      </p>
                    </div>
                  )}

                  {/* Display Order */}
                  <div>
                    <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                      Display Order
                    </label>
                    <input
                      type="text"
                      value={formData.display_order === 0 ? "" : formData.display_order.toString()}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow empty string for deletion
                        if (value === "") {
                          setFormData({ ...formData, display_order: 0 });
                        } else {
                          // Only allow numbers
                          const numValue = parseInt(value);
                          if (!isNaN(numValue)) {
                            setFormData({ ...formData, display_order: numValue });
                          }
                        }
                      }}
                      className="w-full border border-gray-300 rounded-md px-4 py-2"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Lower numbers display first in rotation, starting with number one.
                    </p>
                  </div>

                  {/* Start Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-4 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-4 py-2"
                        required
                      />
                    </div>
                  </div>

                  {/* End Date & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-4 py-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                        End Time *
                      </label>
                      <input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-4 py-2"
                        required
                      />
                    </div>
                  </div>

                </div>

                <div className="flex gap-2 mt-6">
                  <button
                    onClick={handleSaveAd}
                    className="flex-1 px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md font-semibold hover:bg-opacity-90"
                  >
                    {editingAd ? "Update Ad" : "Publish Ad"}
                  </button>
                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Right Side - Preview */}
              <div className="w-1/2 bg-gray-50 p-6 flex flex-col">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Preview</h3>
                <div className="flex-1 min-h-0">
                  <AdPreview
                    selectedSlots={formData.selectedSlots}
                    onSlotClick={handleSlotClick}
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
                    <p className="text-xs text-[color:var(--color-medium)] mt-3 pt-3 border-t border-gray-200">
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

      {/* Runtime modal: set run times for all ads in the selected slot(s) */}
      {showRuntimeModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            <h2 className="text-xl font-bold text-[color:var(--color-dark)] mb-2">Set run times for ads in this slot</h2>
            <p className="text-sm text-[color:var(--color-medium)] mb-4">
              Multiple ads share this slot. Set how many seconds each ad displays before rotating to the next.
            </p>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {runtimeModalAds.map((row, index) => (
                <div key={row.adId ?? "current"} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[color:var(--color-dark)] truncate">
                      {row.adId == null ? "(This ad)" : row.title}
                    </p>
                    {row.adId != null && (
                      <p className="text-xs text-[color:var(--color-medium)]">Existing ad in slot</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <input
                      type="number"
                      min={1}
                      value={row.runtime_seconds ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setRuntimeModalAds((prev) =>
                          prev.map((r, i) => (i === index ? { ...r, runtime_seconds: v ? parseInt(v, 10) : null } : r))
                        );
                      }}
                      className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
                      placeholder="sec"
                    />
                    <span className="text-sm text-[color:var(--color-medium)]">sec</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleRuntimeModalConfirm}
                className="flex-1 px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md font-semibold hover:bg-opacity-90"
              >
                Confirm & save all
              </button>
              <button
                onClick={() => setShowRuntimeModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full my-8 p-6 relative max-h-[calc(100vh-4rem)] flex flex-col">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 z-10 shrink-0 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-[color:var(--color-dark)] mb-4 shrink-0">Ad Settings</h2>

            <div className="space-y-4 overflow-y-auto min-h-0">
              {adSettings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-semibold text-[color:var(--color-dark)]">
                      {getSlotLabel(setting.ad_slot)}
                    </div>
                    <div className="text-sm text-[color:var(--color-medium)]">
                      Show fallback ads when no active ad
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={setting.use_fallback}
                      onChange={(e) => handleUpdateSetting(setting, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--color-riviera-blue)]"></div>
                  </label>
                </div>
              ))}
            </div>

            <div className="mt-6 shrink-0 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full px-4 py-2 bg-[color:var(--color-riviera-blue)] text-white rounded-md font-semibold hover:bg-opacity-90"
              >
                Done
              </button>
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
                className="text-xs font-semibold text-[color:var(--color-riviera-blue)] hover:underline"
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
              className="h-1 bg-[color:var(--color-riviera-blue)] opacity-30 transition-all duration-300"
              style={{ width: `${(toastSecondsLeft / 10) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
