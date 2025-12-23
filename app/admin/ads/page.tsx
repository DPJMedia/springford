"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdPreview } from "@/components/AdPreview";
import type { Ad, AdSetting, AdSlotAssignment } from "@/lib/types/database";

const AD_SLOTS = [
  // Homepage slots (numbered)
  { value: "homepage-banner-top", label: "Section 1: Banner Below Hero" },
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
  });
  // Per-slot fill section settings
  const [slotFillSettings, setSlotFillSettings] = useState<Record<string, boolean>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [runtimeRequired, setRuntimeRequired] = useState(false);
  const [previewTab, setPreviewTab] = useState<"homepage" | "article">("homepage");

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
      alert("Only super admins can access this page!");
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
        alert("Please select an image file");
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
          alert("Storage permissions error. Please run the storage policies SQL script (supabase-storage-ads-policies.sql) in Supabase SQL Editor. See ADS_SETUP.md for instructions.");
        } else {
          alert("Error uploading image: " + uploadError.message);
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
      alert("Error uploading image: " + (error.message || "Unknown error"));
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
          alert("Storage permissions error. Please run the storage policies SQL script (supabase-storage-ads-policies.sql) in Supabase SQL Editor.");
        } else {
          alert("Error uploading image: " + uploadError.message);
        }
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("ads")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Error uploading image: " + (error.message || "Unknown error"));
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

  async function handleSaveAd() {
    // Check if image is provided
    if (!imageFile && !formData.image_url) {
      alert("Please provide an image");
      return;
    }
    
    if (!formData.link_url) {
      alert("Please provide a link URL");
      return;
    }

    if (formData.selectedSlots.length === 0) {
      alert("Please select at least one ad slot");
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      alert("Please set start and end dates");
      return;
    }

    // Convert date/time to Eastern Time (ET) ISO string
    // User enters time in ET, so we need to create a date in ET timezone
    function parseETDateTime(dateStr: string, timeStr: string): string {
      // Parse time string (handle 12-hour format with AM/PM)
      let hours = 0;
      let minutes = 0;
      
      const timeMatch = timeStr.match(/(\d+)\s*:\s*(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        const ampm = timeMatch[3].toUpperCase();
        
        if (ampm === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm === 'AM' && hours === 12) {
          hours = 0;
        }
      } else {
        // Try 24-hour format
        const parts = timeStr.split(':');
        hours = parseInt(parts[0]) || 0;
        minutes = parseInt(parts[1]) || 0;
      }
      
      // Create a date string in ET format
      const [year, month, day] = dateStr.split('-').map(Number);
      const etDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
      
      // Use Intl.DateTimeFormat to convert ET to UTC properly
      // Create a date assuming it's in ET, then convert to UTC
      const tempDate = new Date(`${etDateStr}-05:00`); // Start with EST offset
      
      // Check if DST applies (rough check: March to November)
      const monthNum = month - 1;
      const isDST = monthNum >= 2 && monthNum <= 10;
      
      if (isDST) {
        // Adjust for EDT (UTC-4)
        tempDate.setHours(tempDate.getHours() + 1);
      }
      
      return tempDate.toISOString();
    }

    const startDateTime = parseETDateTime(formData.start_date, formData.start_time || "00:00 AM");
    const endDateTime = parseETDateTime(formData.end_date, formData.end_time || "11:59 PM");

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      alert("End date/time must be after start date/time");
      return;
    }

    if (runtimeRequired && !formData.runtime_seconds) {
      alert("Please set a runtime for this ad (required when multiple ads share the same slot)");
      return;
    }

    // Validate display order (1-20)
    if (formData.display_order < 1 || formData.display_order > 20) {
      alert("Display Order must be between 1 and 20");
      return;
    }

    try {
      // Upload image if we have a file (similar to article upload)
      let finalImageUrl = formData.image_url;
      
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `ad-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("ads")
          .upload(fileName, imageFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
            alert("Storage permissions error. Please run the storage policies SQL script (supabase-storage-ads-policies.sql) in Supabase SQL Editor. See ADS_SETUP.md for instructions.");
          } else {
            alert("Error uploading image: " + uploadError.message);
          }
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("ads")
          .getPublicUrl(fileName);

        finalImageUrl = publicUrl;
      } else if (imagePreview && !formData.image_url) {
        // If we have a preview (from editor), convert to blob and upload
        try {
          const response = await fetch(imagePreview);
          const blob = await response.blob();
          const fileName = `ad-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from("ads")
            .upload(fileName, blob, {
              cacheControl: "3600",
              upsert: false,
              contentType: "image/jpeg",
            });

          if (uploadError) {
            if (uploadError.message.includes("row-level security") || uploadError.message.includes("policy")) {
              alert("Storage permissions error. Please run the storage policies SQL script.");
            } else {
              alert("Error uploading image: " + uploadError.message);
            }
            return;
          }

          const { data: { publicUrl } } = supabase.storage
            .from("ads")
            .getPublicUrl(fileName);

          finalImageUrl = publicUrl;
        } catch (error: any) {
          alert("Error processing image: " + error.message);
          return;
        }
      }

      if (!finalImageUrl) {
        alert("Please provide an image");
        return;
      }

      if (editingAd) {
        // Update existing ad
        const { error: updateError } = await supabase
          .from("ads")
          .update({
            title: formData.title || null,
            image_url: finalImageUrl,
            link_url: formData.link_url,
            start_date: startDateTime,
            end_date: endDateTime,
            runtime_seconds: formData.runtime_seconds,
            display_order: formData.display_order,
            is_active: formData.is_active,
            fill_section: formData.fill_section,
          })
          .eq("id", editingAd.id);

        if (updateError) throw updateError;

        // Update slot assignments
        // Delete old assignments
        await supabase
          .from("ad_slot_assignments")
          .delete()
          .eq("ad_id", editingAd.id);

        // Insert new assignments with per-slot fill settings
        const assignments = formData.selectedSlots.map((slot) => ({
          ad_id: editingAd.id,
          ad_slot: slot,
          fill_section: slotFillSettings[slot] ?? true,
        }));

        const { error: assignError } = await supabase
          .from("ad_slot_assignments")
          .insert(assignments);

        if (assignError) throw assignError;
      } else {
        // Create new ad
        const { data: newAd, error: insertError} = await supabase
          .from("ads")
          .insert({
            title: formData.title || null,
            image_url: finalImageUrl,
            link_url: formData.link_url,
            ad_slot: formData.selectedSlots[0], // Legacy field
            start_date: startDateTime,
            end_date: endDateTime,
            runtime_seconds: formData.runtime_seconds,
            display_order: formData.display_order,
            is_active: formData.is_active,
            fill_section: formData.fill_section,
            created_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Create slot assignments with per-slot fill settings
        const assignments = formData.selectedSlots.map((slot) => ({
          ad_id: newAd.id,
          ad_slot: slot,
          fill_section: slotFillSettings[slot] ?? true,
        }));

        const { error: assignError } = await supabase
          .from("ad_slot_assignments")
          .insert(assignments);

        if (assignError) throw assignError;
      }

      loadAds();
      handleCloseModal();
      alert(editingAd ? "Ad updated successfully!" : "Ad created successfully!");
    } catch (error: any) {
      alert("Error saving ad: " + error.message);
    }
  }

  async function handleDeleteAd(adId: string) {
    if (!confirm("Are you sure you want to delete this ad?")) return;

    try {
      // Delete slot assignments first (cascade should handle this, but being explicit)
      await supabase.from("ad_slot_assignments").delete().eq("ad_id", adId);

      const { error } = await supabase.from("ads").delete().eq("id", adId);
      if (error) throw error;
      loadAds();
      alert("Ad deleted successfully!");
    } catch (error: any) {
      alert("Error deleting ad: " + error.message);
    }
  }

  async function handleToggleActive(ad: Ad) {
    try {
      const { error } = await supabase
        .from("ads")
        .update({ is_active: !ad.is_active })
        .eq("id", ad.id);

      if (error) throw error;
      loadAds();
    } catch (error: any) {
      alert("Error updating ad: " + error.message);
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
    } catch (error: any) {
      alert("Error updating setting: " + error.message);
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
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData({
        title: "",
        image_url: "",
        link_url: "",
        selectedSlots: [],
        start_date: now.toISOString().split("T")[0],
        start_time: now.toTimeString().slice(0, 5),
        end_date: tomorrow.toISOString().split("T")[0],
        end_time: "23:59",
        runtime_seconds: null,
        display_order: 0,
        is_active: true,
        fill_section: true,
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

        {/* Ads Table */}
        <div className="bg-white rounded-lg border border-[color:var(--color-border)] overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Ad</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Slots</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Link</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[color:var(--color-dark)]">Schedule</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[color:var(--color-dark)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad: any) => (
                <tr key={ad.id} className="border-t border-[color:var(--color-border)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={ad.image_url}
                        alt={ad.title || "Ad"}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div>
                        <div className="text-sm font-medium text-[color:var(--color-dark)]">
                          {ad.title || "Untitled Ad"}
                        </div>
                        {ad.runtime_seconds && (
                          <div className="text-xs text-gray-500">
                            Runtime: {ad.runtime_seconds}s
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[color:var(--color-medium)]">
                    <div className="flex flex-wrap gap-1">
                      {(ad.slots || [ad.ad_slot].filter(Boolean)).map((slot: string) => (
                        <span
                          key={slot}
                          className="inline-flex rounded-full bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-semibold"
                        >
                          {getSlotLabel(slot)}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <a
                      href={ad.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[color:var(--color-riviera-blue)] hover:underline truncate block max-w-xs"
                    >
                      {ad.link_url}
                    </a>
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
                      <div>Start: {new Date(ad.start_date).toLocaleString()}</div>
                      <div>End: {new Date(ad.end_date).toLocaleString()}</div>
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
                        onClick={() => handleToggleActive(ad)}
                        className={`text-xs font-semibold hover:underline ${
                          ad.is_active ? "text-yellow-600" : "text-green-600"
                        }`}
                      >
                        {ad.is_active ? "Disable" : "Enable"}
                      </button>
                      <span className="text-[color:var(--color-medium)]">|</span>
                      <button
                        onClick={() => handleDeleteAd(ad.id)}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
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
                            <div className="flex items-center gap-2">
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
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`fill-${slot}`}
                                checked={slotFillSettings[slot] ?? true}
                                onChange={(e) =>
                                  setSlotFillSettings({
                                    ...slotFillSettings,
                                    [slot]: e.target.checked,
                                  })
                                }
                                className="h-4 w-4 text-[color:var(--color-riviera-blue)]"
                              />
                              <label htmlFor={`fill-${slot}`} className="text-xs text-gray-700">
                                Fill section
                              </label>
                            </div>
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

                  {/* Active Toggle */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="h-4 w-4 text-[color:var(--color-riviera-blue)]"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-[color:var(--color-dark)]">
                      Active (ad will display when scheduled)
                    </label>
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
              <div className="w-1/2 bg-gray-50 p-6">
                <h3 className="text-lg font-bold text-[color:var(--color-dark)] mb-4">Preview</h3>
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
                  currentTab={previewTab}
                  onTabChange={setPreviewTab}
                />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)] transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="text-2xl font-bold text-[color:var(--color-dark)] mb-4">Ad Settings</h2>

            <div className="space-y-4">
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

            <div className="mt-6">
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
    </div>
  );
}
