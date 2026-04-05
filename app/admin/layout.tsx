"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profileData?.is_admin && !profileData?.is_super_admin) {
      alert("You don't have admin access!");
      router.push("/");
      return;
    }

    setUser(user);
    setProfile(profileData);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--admin-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[var(--admin-accent)] border-r-transparent"></div>
          <p className="mt-4 text-[var(--admin-text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout min-h-screen bg-[var(--admin-bg)]">
      <div className="flex">
        {/* Desktop Sidebar */}
        <AdminSidebar profile={profile} />

        {/* Main Content */}
        <main className="flex-1 min-h-screen min-w-0">
          <div className="bg-[var(--admin-sidebar-bg)] min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav profile={profile} />
    </div>
  );
}
