"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PROTECTED_TENANT_SLUG } from "@/lib/tenant/protectedTenant";

export function TenantDeleteSection({
  tenantId,
  tenantSlug,
}: {
  tenantId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (tenantSlug === PROTECTED_TENANT_SLUG) {
    return null;
  }

  async function handleDelete() {
    setError(null);
    if (confirmText.trim() !== tenantSlug) {
      setError(`Type the slug exactly: ${tenantSlug}`);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof j.error === "string" ? j.error : "Could not delete tenant.");
        return;
      }
      router.push("/admin/tenants");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-6">
      <h2 className="text-lg font-semibold text-red-300 m-0">Delete tenant</h2>
      <p className="mt-2 text-sm text-[var(--admin-text-muted)] m-0">
        Permanently removes this site&apos;s tenant row and all related analytics, ads, newsletter, and article data
        for this tenant. This cannot be undone. Spring-Ford Press cannot be deleted here.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setConfirmText("");
            setError(null);
          }}
          className="mt-4 rounded-md border border-red-700 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-900/50"
        >
          Delete this tenant…
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
              Type slug <span className="font-mono text-[var(--admin-text)]">{tenantSlug}</span> to confirm
            </span>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              className="w-full max-w-md rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
            />
          </label>
          {error && <p className="m-0 text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setOpen(false);
                setConfirmText("");
                setError(null);
              }}
              className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text-muted)] hover:bg-[var(--admin-table-header-bg)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
