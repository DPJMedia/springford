"use client";

import { useEffect, useState, useRef } from "react";
import { CancelNewsletterModal } from "@/components/CancelNewsletterModal";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getAvatarInitials,
  isDiffuseAIUser,
  normalizeAvatarUrl,
} from "@/lib/user/display";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedUsername, setEditedUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  
  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Newsletter tab and cancel
  const [activeTab, setActiveTab] = useState<"profile" | "newsletter" | "support">("profile");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [supportCanceling, setSupportCanceling] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "support") {
      setActiveTab("support");
    }
    if (params.get("tab") === "newsletter") {
      setActiveTab("newsletter");
    }
    if (params.get("supportCanceled") === "1") {
      setActiveTab("support");
      setSuccess("Your recurring support has been canceled. A confirmation email has been sent.");
      setTimeout(() => setSuccess(null), 8000);
      window.history.replaceState({}, "", "/profile");
    }
  }, []);

  async function checkUser() {
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

    setUser(currentUser);
    setProfile(profileData);
    setEditedName(profileData?.full_name || "");
    setEditedUsername(profileData?.username || "");
    setAvatarPreview(normalizeAvatarUrl(profileData?.avatar_url));
    setLoading(false);
  }

  async function uploadAvatar(file: File) {
    try {
      setSaving(true);
      setError(null);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const existingUrl = normalizeAvatarUrl(profile?.avatar_url);
      if (existingUrl) {
        const urlParts = existingUrl.split("/");
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarPreview(publicUrl);
      setProfile({ ...profile, avatar_url: publicUrl });
      setShowAvatarMenu(false);
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error uploading avatar:', err);
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setSaving(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      uploadAvatar(file);
    }
  }

  async function checkUsernameAvailability(username: string): Promise<boolean> {
    if (!username || username.trim() === '') return true;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username.trim())
      .neq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      return false;
    }

    return !data;
  }

  async function saveName() {
    try {
      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ full_name: editedName.trim() || null })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, full_name: editedName.trim() || null });
      setIsEditingName(false);
      setSuccess('Name updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  }

  async function saveUsername() {
    try {
      setSaving(true);
      setError(null);
      setUsernameError(null);

      const trimmedUsername = editedUsername.trim();
      
      // Validate username format
      if (trimmedUsername && !/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
        setUsernameError('Username can only contain letters, numbers, and underscores');
        setSaving(false);
        return;
      }

      if (trimmedUsername && trimmedUsername.length < 3) {
        setUsernameError('Username must be at least 3 characters');
        setSaving(false);
        return;
      }

      // Check availability
      const isAvailable = await checkUsernameAvailability(trimmedUsername);
      if (!isAvailable) {
        setUsernameError('This username is already taken');
        setSaving(false);
        return;
      }

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ username: trimmedUsername || null })
        .eq('id', user.id);

      if (updateError) {
        if (updateError.code === '23505') { // Unique constraint violation
          setUsernameError('This username is already taken');
        } else {
          throw updateError;
        }
        setSaving(false);
        return;
      }

      setProfile({ ...profile, username: trimmedUsername || null });
      setIsEditingUsername(false);
      setSuccess('Username updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setSaving(false);
    }
  }

  /** Active Stripe subscription row (includes “cancel at period end” until it fully ends). */
  const hasRecurringSupportCard =
    !!profile?.stripe_support_subscription_id &&
    (profile.support_subscription_status === "active" ||
      profile.support_subscription_status === "trialing");

  const isScheduledToEnd =
    profile?.support_subscription_cancel_at_period_end === true;

  const supportPeriodEnd = profile?.support_subscription_current_period_end ?? null;
  const supportCancelAt = profile?.support_subscription_cancel_at ?? null;
  /** Limited-term plan: commitment end differs from current Stripe period end */
  const hasDistinctCommitmentEnd =
    Boolean(supportCancelAt && supportPeriodEnd && supportCancelAt !== supportPeriodEnd);

  async function handleCancelSupportSubscription() {
    if (!confirm("Stop renewing after the current period? You won’t be charged again.")) return;
    setSupportCanceling(true);
    setError(null);
    try {
      const res = await fetch("/api/support/cancel-subscription", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not cancel");
      await checkUser();
      if (data.noop) {
        setSuccess(
          "No change needed — this subscription was already ending or canceled."
        );
      } else {
        setSuccess(
          "Recurring support will end after your current billing period. A confirmation email has been sent."
        );
      }
      setTimeout(() => setSuccess(null), 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel");
    } finally {
      setSupportCanceling(false);
    }
  }

  async function handleCancelNewsletter() {
    setCancelling(true);
    try {
      const res = await fetch("/api/newsletter/unsubscribe", { method: "POST" });
      if (!res.ok) throw new Error("Failed to unsubscribe");
      setShowCancelModal(false);
      setProfile({ ...profile, newsletter_subscribed: false, newsletter_subscribed_at: null });
      setSuccess("You have been unsubscribed. A confirmation email has been sent.");
      setTimeout(() => setSuccess(null), 5000);
    } catch {
      setError("Failed to unsubscribe. Please try again.");
    } finally {
      setCancelling(false);
    }
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

  if (!user || !profile) return null;

  return (
    <div className="min-h-screen bg-[color:var(--color-surface)]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-[color:var(--color-riviera-blue)] hover:underline flex items-center gap-1 mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-black text-[color:var(--color-dark)]">My Profile</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-300 text-red-800 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-300 text-green-800 rounded-lg p-4 mb-6">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-[color:var(--color-border)]">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === "profile"
                ? "border-[color:var(--color-dark)] text-[color:var(--color-dark)]"
                : "border-transparent text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("newsletter")}
            className={`px-4 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === "newsletter"
                ? "border-[color:var(--color-dark)] text-[color:var(--color-dark)]"
                : "border-transparent text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
            }`}
          >
            Newsletter
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`px-4 py-3 text-sm font-semibold transition border-b-2 -mb-px ${
              activeTab === "support"
                ? "border-[color:var(--color-dark)] text-[color:var(--color-dark)]"
                : "border-transparent text-[color:var(--color-medium)] hover:text-[color:var(--color-dark)]"
            }`}
          >
            Support
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[color:var(--color-border)] p-6">
          {activeTab === "profile" ? (
          <>
          {/* Profile Picture Section */}
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-[color:var(--color-border)]">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-[color:var(--color-border)]"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[color:var(--color-riviera-blue)] flex items-center justify-center text-white text-2xl font-bold border-2 border-[color:var(--color-border)]">
                  {getAvatarInitials(profile.full_name, user.email, {
                    isDiffuseAI: isDiffuseAIUser(profile.full_name, user.email),
                  })}
                </div>
              )}
              <button
                onClick={() => setShowAvatarMenu(!showAvatarMenu)}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[color:var(--color-riviera-blue)] text-white flex items-center justify-center hover:bg-opacity-90 transition shadow-lg border-2 border-white"
                aria-label="Edit profile picture"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              
              {showAvatarMenu && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-lg border border-[color:var(--color-border)] z-10 min-w-[180px]">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAvatarMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Photo
                  </button>
                  <button
                    onClick={() => {
                      cameraInputRef.current?.click();
                      setShowAvatarMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Take Photo
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="flex-1 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-[color:var(--color-dark)]">
                    {profile.full_name || user.email?.split('@')[0] || 'User'}
                  </h2>
                  {profile.newsletter_subscribed ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold border border-amber-200">
                      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .55-.45 1-1 1H6c-.55 0-1-.45-1-1v-1h14v1z" />
                      </svg>
                      Newsletter Subscriber
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs font-medium text-[color:var(--color-medium)]">
                        Basic Tier
                      </span>
                      <Link
                        href="/subscribe"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[color:var(--color-riviera-blue)] text-white text-xs font-semibold hover:bg-opacity-90 transition"
                      >
                        Join the Newsletter
                      </Link>
                    </span>
                  )}
                </div>
                <p className="text-sm text-[color:var(--color-medium)] mt-0.5">
                  {profile.username ? `@${profile.username}` : 'No username set'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Account Number
              </label>
              <p className="text-sm font-mono font-semibold text-[color:var(--color-dark)] bg-blue-50 px-4 py-2 rounded-md border border-blue-200">
                {profile.account_number || "Generating..."}
              </p>
              <p className="text-xs text-[color:var(--color-medium)] mt-1">
                Use this unique ID for support inquiries and data tracking
              </p>
            </div>

            {/* Full Name - Editable */}
            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Full Name
              </label>
              {isEditingName ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-4 py-2"
                    placeholder="Enter your full name"
                    disabled={saving}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveName}
                      disabled={saving}
                      className="px-4 py-1.5 bg-[color:var(--color-riviera-blue)] text-white rounded-md text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingName(false);
                        setEditedName(profile.full_name || '');
                      }}
                      disabled={saving}
                      className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-md">
                  <p className="text-sm text-[color:var(--color-medium)]">
                    {profile.full_name || "Not set"}
                  </p>
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="text-[color:var(--color-riviera-blue)] hover:underline text-sm font-semibold"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            {/* Username - Editable */}
            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Username
              </label>
              {isEditingUsername ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">@</span>
                    <input
                      type="text"
                      value={editedUsername}
                      onChange={(e) => {
                        setEditedUsername(e.target.value);
                        setUsernameError(null);
                      }}
                      className="flex-1 border border-gray-300 rounded-md px-4 py-2"
                      placeholder="username"
                      disabled={saving}
                      pattern="[a-zA-Z0-9_]+"
                    />
                  </div>
                  {usernameError && (
                    <p className="text-xs text-red-600">{usernameError}</p>
                  )}
                  <p className="text-xs text-[color:var(--color-medium)]">
                    Username can only contain letters, numbers, and underscores. Must be at least 3 characters.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={saveUsername}
                      disabled={saving}
                      className="px-4 py-1.5 bg-[color:var(--color-riviera-blue)] text-white rounded-md text-sm font-semibold hover:bg-opacity-90 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingUsername(false);
                        setEditedUsername(profile.username || '');
                        setUsernameError(null);
                      }}
                      disabled={saving}
                      className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-md">
                  <p className="text-sm text-[color:var(--color-medium)]">
                    {profile.username ? `@${profile.username}` : "Not set"}
                  </p>
                  <button
                    onClick={() => setIsEditingUsername(true)}
                    className="text-[color:var(--color-riviera-blue)] hover:underline text-sm font-semibold"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[color:var(--color-dark)] mb-1">
                Email
              </label>
              <p className="text-sm text-[color:var(--color-medium)] bg-gray-50 px-4 py-2 rounded-md">
                {user.email}
              </p>
              <p className="text-xs text-[color:var(--color-medium)] mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>
          </>
          ) : activeTab === "support" ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-[color:var(--color-dark)]">
              Recurring support
            </h2>
            <p className="text-sm text-[color:var(--color-medium)]">
              Manage your recurring contribution to Spring-Ford Press. One-time donations are not listed here.
            </p>

            {hasRecurringSupportCard ? (
              <div className="space-y-4 rounded-lg border border-[color:var(--color-border)] bg-gray-50 p-4">
                {isScheduledToEnd && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                    <p className="text-sm font-semibold text-amber-900">Cancellation scheduled</p>
                    <p className="text-xs text-amber-800 mt-0.5">
                      You won’t be charged again after the “no further charges” date below. This page will clear once the subscription fully ends in Stripe.
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-[color:var(--color-medium)]">
                    {isScheduledToEnd ? "Your plan amount" : "Amount"}
                  </p>
                  <p className="text-lg font-bold text-[color:var(--color-dark)]">
                    {profile.support_subscription_amount_cents != null
                      ? new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: "USD",
                        }).format(profile.support_subscription_amount_cents / 100)
                      : "—"}
                    <span className="text-sm font-normal text-[color:var(--color-medium)]">
                      {" "}
                      / {profile.support_subscription_interval === "year" ? "year" : "month"}
                    </span>
                  </p>
                </div>
                {profile.support_subscription_started_at && (
                  <div>
                    <p className="text-xs font-medium text-[color:var(--color-medium)]">
                      Support started
                    </p>
                    <p className="text-sm text-[color:var(--color-dark)]">
                      {new Date(profile.support_subscription_started_at).toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </p>
                  </div>
                )}
                {!isScheduledToEnd && supportPeriodEnd && (
                  <div>
                    <p className="text-xs font-medium text-[color:var(--color-medium)]">
                      Current billing period ends
                    </p>
                    <p className="text-sm text-[color:var(--color-dark)]">
                      {new Date(supportPeriodEnd).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {!isScheduledToEnd && hasDistinctCommitmentEnd && supportCancelAt && (
                  <div>
                    <p className="text-xs font-medium text-[color:var(--color-medium)]">
                      Subscription commitment ends
                    </p>
                    <p className="text-sm text-[color:var(--color-dark)]">
                      {new Date(supportCancelAt).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {isScheduledToEnd && (supportCancelAt || supportPeriodEnd) && (
                  <div>
                    <p className="text-xs font-medium text-[color:var(--color-medium)]">
                      No further charges after
                    </p>
                    <p className="text-sm text-[color:var(--color-dark)]">
                      {new Date(supportCancelAt || supportPeriodEnd || "").toLocaleDateString(
                        undefined,
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </p>
                  </div>
                )}
                {!isScheduledToEnd && (
                  <div className="pt-2 border-t border-[color:var(--color-border)]">
                    <p className="text-xs text-[color:var(--color-medium)] mb-3">
                      Cancel stops future charges after the end of your current billing period (or immediately if required by our payment provider). You’ll receive a confirmation email.
                    </p>
                    <button
                      type="button"
                      onClick={handleCancelSupportSubscription}
                      disabled={supportCanceling}
                      className="text-sm font-semibold text-red-600 hover:text-red-700 underline disabled:opacity-50"
                    >
                      {supportCanceling ? "Processing…" : "Cancel recurring support"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[color:var(--color-medium)]">
                  You don’t have an active recurring support subscription.
                </p>
                <Link
                  href="/support"
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
                >
                  Set up support
                </Link>
              </div>
            )}
          </div>
          ) : (
          /* Newsletter tab */
          <div className="space-y-6">
            {!profile.newsletter_subscribed ? (
              <>
                <h2 className="text-lg font-semibold text-[color:var(--color-dark)]">
                  Newsletter subscription
                </h2>
                <p className="text-sm text-[color:var(--color-medium)]">
                  Get the latest neighborhood news, premium articles, and exclusive updates by subscribing to the Spring-Ford Press newsletter.
                </p>
                <Link
                  href="/subscribe"
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-opacity-90"
                >
                  Subscribe
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[color:var(--color-dark)]">
                  Newsletter subscription
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--color-medium)] mb-1">
                      Subscribed since
                    </label>
                    <p className="text-sm text-[color:var(--color-dark)]">
                      {profile.newsletter_subscribed_at
                        ? new Date(profile.newsletter_subscribed_at).toLocaleDateString(undefined, {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[color:var(--color-medium)] mb-1">
                      Plan
                    </label>
                    <p className="text-sm font-semibold text-[color:var(--color-dark)]">
                      Free tier — first year free (early subscriber offer)
                    </p>
                    <p className="text-xs text-[color:var(--color-medium)] mt-0.5">
                      You are not being charged.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-[color:var(--color-border)]">
                  <h3 className="text-sm font-semibold text-[color:var(--color-dark)] mb-2">
                    Cancel newsletter
                  </h3>
                  <p className="text-xs text-[color:var(--color-medium)] mb-3">
                    Unsubscribe from the Spring-Ford Press newsletter. You will receive a confirmation email and can resubscribe anytime.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
                  >
                    Cancel newsletter
                  </button>
                </div>
              </>
            )}
          </div>
          )}
        </div>
      </div>

      <CancelNewsletterModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelNewsletter}
        cancelling={cancelling}
      />
    </div>
  );
}
