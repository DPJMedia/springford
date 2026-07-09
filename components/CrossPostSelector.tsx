"use client";

import { useEffect, useState } from "react";
import { useTenant } from "@/lib/tenant/TenantProvider";

type TenantOption = { id: string; name: string; slug: string; domain: string };

/**
 * Lets an editor also publish the current article to OTHER Press tenants they can
 * access. Views stay separated per site; the copies point their canonical URL back
 * to this article. Reports the selected tenant ids to the parent via onChange.
 */
export function CrossPostSelector({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const current = useTenant();
  const [options, setOptions] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/tenants/my-tenants", { credentials: "include" });
        if (!res.ok) throw new Error("failed");
        const j = await res.json();
        const others: TenantOption[] = (j.tenants ?? []).filter(
          (t: TenantOption) => t.id !== current.id,
        );
        if (alive) setOptions(others);
      } catch {
        if (alive) setOptions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [current.id]);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  if (loading) return null;
  if (options.length === 0) return null; // nothing to cross-post to

  return (
    <div className="space-y-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-table-header-bg)] p-4">
      <p className="text-sm font-semibold text-[var(--admin-text)]">Also publish to other sites</p>
      <p className="text-xs text-[var(--admin-text-muted)]">
        The same article publishes on each selected site with its own views. Each copy links back
        to this one as the original (so the sites don&rsquo;t compete in search).
      </p>
      <div className="flex flex-col gap-2 pt-1">
        {options.map((t) => (
          <label key={t.id} className="flex items-center gap-2 text-sm text-[var(--admin-text)] cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(t.id)}
              onChange={() => toggle(t.id)}
              className="w-4 h-4 accent-[var(--admin-accent)] rounded cursor-pointer"
            />
            <span>
              {t.name} <span className="text-[var(--admin-text-muted)]">({t.domain})</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
