"use client";

import { useEffect, useState, type ChangeEvent } from "react";
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

  if (!payload || payload.tenants.length === 0) {
    return null;
  }

  const selectValue = onOverview ? "__overview" : currentTenantId;

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    if (!payload) return;
    const v = e.target.value;
    if (v === "__overview") {
      window.location.href = `${window.location.origin}/admin/overview`;
      return;
    }
    const t = payload.tenants.find((x) => x.id === v);
    if (t) {
      window.location.href = `${tenantPublicOrigin(t.domain)}/admin`;
    }
  }

  return (
    <div className={compact ? "px-2 pb-2" : "px-3 pb-3"}>
      <label
        htmlFor="admin-tenant-switcher"
        className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]"
      >
        Site
      </label>
      <select
        id="admin-tenant-switcher"
        value={selectValue}
        onChange={handleChange}
        className={`w-full rounded-md border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] text-sm text-[var(--admin-text)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/40 ${
          compact ? "px-2 py-1.5" : "px-3 py-2"
        }`}
      >
        {payload.is_super_admin ? (
          <option value="__overview">All Sites</option>
        ) : null}
        {payload.tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
