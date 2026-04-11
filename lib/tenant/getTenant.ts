import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantRow } from "@/lib/types/database";

/** Strip port from Host-style string (localhost:3000 → localhost; keeps IPv6 in brackets). */
export function stripPortFromHost(host: string): string {
  const h = host.trim();
  if (h.startsWith("[")) {
    const end = h.indexOf("]");
    if (end !== -1) {
      const rest = h.slice(end + 1);
      if (rest.startsWith(":")) return h.slice(0, end + 1);
    }
    return h;
  }
  const colon = h.indexOf(":");
  if (colon !== -1) return h.slice(0, colon);
  return h;
}

/** Lowercase, strip port, strip leading www. */
export function normalizeDomainForLookup(domain: string): string {
  let d = stripPortFromHost(domain).toLowerCase();
  if (d.startsWith("www.")) d = d.slice(4);
  return d;
}

async function fetchTenantByDomain(domain: string): Promise<TenantRow | null> {
  const normalized = normalizeDomainForLookup(domain);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("domain", normalized)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as TenantRow;
}

/**
 * Resolve tenant by canonical domain (no port, no www). Service role only; cached per request.
 */
export const getTenant = cache(fetchTenantByDomain);

async function fetchTenantBySlug(slug: string): Promise<TenantRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as TenantRow;
}

/** e.g. Spring-Ford fallback for localhost / *.vercel.app */
export const getTenantBySlug = cache(fetchTenantBySlug);

async function fetchTenantById(id: string): Promise<TenantRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as TenantRow;
}

export const getTenantById = cache(fetchTenantById);
