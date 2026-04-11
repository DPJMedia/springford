"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTenant } from "@/lib/tenant/TenantProvider";
import { tenantPublicOrigin } from "@/lib/tenant/publicSiteUrl";

type TenantOption = { id: string; name: string; slug: string; domain: string };

export function AdminTenantSwitcher({ compact = false }: { compact?: boolean }) {
  const { id: currentTenantId } = useTenant();
  const pathname = usePathname();
  const onOverview = pathname?.startsWith("/admin/overview") ?? false;
  const [payload, setPayload] = useState<{
    is_super_admin: boolean;
    tenants: TenantOption[];
  } | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/tenants/my-tenants", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j && Array.isArray(j.tenants)) {
          setPayload({
            is_super_admin: Boolean(j.is_super_admin),
            tenants: j.tenants as TenantOption[],
          });
        }
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent | PointerEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  if (!payload || payload.tenants.length === 0) {
    return null;
  }

  const currentTenant = payload.tenants.find((x) => x.id === currentTenantId);
  const triggerLabel = onOverview
    ? "All Sites"
    : (currentTenant?.name ?? payload.tenants[0]?.name ?? "Site");

  function navigateTo(value: string) {
    if (!payload) return;
    if (value === "__overview") {
      window.location.href = `${window.location.origin}/admin/overview`;
      return;
    }
    const t = payload.tenants.find((x) => x.id === value);
    if (t) {
      window.location.href = `${tenantPublicOrigin(t.domain)}/admin`;
    }
  }

  function selectValue(value: string) {
    navigateTo(value);
    setOpen(false);
  }

  const triggerBase =
    "flex w-full min-h-[2.75rem] items-center justify-between gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition-all bg-[var(--admin-accent)]/20 text-[var(--admin-accent)]";
  const triggerCompact =
    "min-h-[2.5rem] px-2 py-1.5 text-sm font-medium";

  return (
    <div
      ref={rootRef}
      className={
        compact
          ? "relative w-full min-w-0 max-w-full px-2 pb-2"
          : "relative w-full min-w-0 max-w-full px-3 pb-3"
      }
    >
      <button
        type="button"
        id="admin-tenant-switcher"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${triggerBase} max-w-full min-w-0 ${compact ? triggerCompact : "text-sm font-medium"}`}
      >
        <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--admin-accent)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-labelledby="admin-tenant-switcher"
          className={`absolute left-0 right-0 z-[60] w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-sidebar-bg)] shadow-lg ${
            compact
              ? "bottom-full mb-1 max-h-[min(50vh,16rem)]"
              : "top-full mt-1 max-h-[min(60vh,20rem)]"
          } overflow-y-auto py-1`}
        >
          {payload.is_super_admin ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={onOverview}
                onClick={() => selectValue("__overview")}
                className={`flex w-full px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--admin-card-bg)] ${
                  onOverview ? "text-[var(--admin-accent)]" : "text-[var(--admin-text)]"
                }`}
              >
                All Sites
              </button>
            </li>
          ) : null}
          {payload.tenants.map((t) => {
            const selected = !onOverview && t.id === currentTenantId;
            return (
              <li key={t.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => selectValue(t.id)}
                  className={`flex w-full px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-[var(--admin-card-bg)] ${
                    selected ? "text-[var(--admin-accent)]" : "text-[var(--admin-text)]"
                  }`}
                >
                  {t.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
