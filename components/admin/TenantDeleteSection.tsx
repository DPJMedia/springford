"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PROTECTED_TENANT_SLUG } from "@/lib/tenant/protectedTenant";

/** Next to "Back to tenants" — always visible; disabled for Spring-Ford Press. */
export function TenantDeleteHeaderButton({
  tenantSlug,
  onOpen,
}: {
  tenantSlug: string;
  onOpen: () => void;
}) {
  const isProtected = tenantSlug === PROTECTED_TENANT_SLUG;

  return (
    <button
      type="button"
      disabled={isProtected}
      title={
        isProtected
          ? "Spring-Ford Press cannot be deleted (production tenant)."
          : "Permanently delete this tenant and all related data"
      }
      onClick={() => onOpen()}
      className={`rounded-md border px-4 py-2 text-sm font-semibold ${
        isProtected
          ? "cursor-not-allowed border-[var(--admin-border)] text-[var(--admin-text-muted)] opacity-60"
          : "border-red-700/80 bg-red-950/30 text-red-200 hover:bg-red-900/40"
      }`}
    >
      Delete tenant
    </button>
  );
}

/** Modal: type slug to confirm, then DELETE API. */
export function TenantDeleteConfirmModal({
  open,
  onClose,
  tenantId,
  tenantSlug,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

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
      onClose();
      router.push("/admin/tenants");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  function handleClose() {
    if (deleting) return;
    setConfirmText("");
    setError(null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        aria-hidden
        onClick={() => handleClose()}
      />
      <div className="relative w-full max-w-md rounded-xl border border-red-900/50 bg-[var(--admin-card-bg)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-red-300 m-0">Delete tenant</h2>
        <p className="mt-2 text-sm text-[var(--admin-text-muted)] m-0">
          Permanently removes this site&apos;s tenant row and all related analytics, ads, newsletter, and article data.
          This cannot be undone.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
            Type slug <span className="font-mono text-[var(--admin-text)]">{tenantSlug}</span> to confirm
          </span>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] px-3 py-2 text-sm text-[var(--admin-text)]"
          />
        </label>
        {error && <p className="mt-2 m-0 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
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
            onClick={handleClose}
            className="rounded-md border border-[var(--admin-border)] px-4 py-2 text-sm font-semibold text-[var(--admin-text-muted)] hover:bg-[var(--admin-table-header-bg)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
