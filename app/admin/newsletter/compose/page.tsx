"use client";
// Legacy URL — redirect to the new template editor
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ComposeRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaignId");
    if (id) {
      router.replace(`/admin/newsletter/template-editor?id=${id}`);
    } else if (campaignId) {
      router.replace(`/admin/newsletter/campaigns/new?id=${campaignId}`);
    } else {
      router.replace("/admin/newsletter/template-editor");
    }
  }, [router, searchParams]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
    </div>
  );
}

export default function ComposeRedirect() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--admin-accent)] border-r-transparent" />
        </div>
      }
    >
      <ComposeRedirectInner />
    </Suspense>
  );
}
