# Multi-tenant migration (Spring-Ford Press)

This document tracks the phased migration. **Phase 1 is complete** on the Spring-Ford Supabase project; Phases 2–4 are pending.

---

## Phase 1 — database (complete)

**Migration file (repo):** [`supabase/migrations/20260410223230_phase1_multi_tenant_core.sql`](../supabase/migrations/20260410223230_phase1_multi_tenant_core.sql)

**Applied remotely via:** Supabase MCP `apply_migration` — name `phase1_multi_tenant_core`, version `20260410223230` (recorded in project migration history).

### What changed (additive only)

- **`tenants`** — `id`, `name`, `slug` (unique), `domain` (unique), `from_email`, `from_name`, `section_config` (jsonb, default `[]`), `is_active`, `created_at`.
- **Seed tenant:** Spring-Ford — slug `spring-ford`, domain `springford.press`, `from_email` `admin@dpjmedia.com`, `from_name` `Spring-Ford Press`, `section_config` built from all rows in `public.sections` (10 `{ slug, label }` pairs; slug = lower-kebab of `name`).
- **`tenant_id`** (uuid, nullable, FK → `tenants.id`) added and backfilled on: `articles`, `ads`, `ad_slot_assignments`, `ad_settings`, `notifications`, `editors_picks`, `newsletter_templates`, `newsletter_campaigns`, `newsletter_email_events`, `saved_ad_quotes`, `page_views`, `ad_impressions`, `ad_clicks`, `author_clicks`, `section_clicks`, `article_scroll_data`, `diffuse_connections`, `diffuse_imported_articles`, `hidden_tags`.
- **`tenant_newsletter_subscriptions`** — `user_id` (FK `auth.users`), `tenant_id`, `subscribed`, `subscribed_at`, `unsubscribed_at`, `UNIQUE(user_id, tenant_id)`.
- **Backfill newsletter table** from `user_profiles` where `newsletter_subscribed = true` (dual source of truth until Phase 3; **`user_profiles` columns not removed**).
- **`tenant_memberships`** — `user_id`, `tenant_id`, `role` (`admin` | `editor` | `reader`), `UNIQUE(user_id, tenant_id)`.
- **Backfill memberships** for Spring-Ford where `is_admin OR is_super_admin` with `role = 'admin'`.
- **`articles` uniqueness:** dropped global `UNIQUE(slug)`, added **`UNIQUE(tenant_id, slug)`** (`articles_tenant_id_slug_key`). Preconditions: no duplicate slugs (verified before apply).
- **Indexes:** `idx_<table>_tenant_id` on each tenanted table; plus indexes on `tenant_newsletter_subscriptions` and `tenant_memberships` for `tenant_id` / `user_id`.

### Not changed in Phase 1

- `handle_new_user` auth trigger  
- Existing RLS policies (no tenant scoping yet)  
- `user_profiles.newsletter_subscribed` (or any other column)  
- `sections` table  
- `tenant_id` **not** set to `NOT NULL` yet  

### Row counts: before vs after (tenanted tables)

Pre-migration snapshot vs post-migration verification. All tables showed **`tenant_id` fully backfilled** (`NULL` count `0`).

| Table | Before | After | Notes |
|--------|--------|-------|--------|
| articles | 75 | 75 | Match |
| ads | 13 | 13 | Match |
| ad_slot_assignments | 18 | 18 | Match |
| ad_settings | 16 | 16 | Match |
| notifications | 2663 | 2663 | Match |
| editors_picks | 3 | 3 | Match |
| newsletter_templates | 7 | 7 | Match |
| newsletter_campaigns | 11 | 11 | Match |
| newsletter_email_events | 292 | 292 | Match |
| saved_ad_quotes | 1 | 1 | Match |
| page_views | 32254 | 32254 | Match |
| ad_impressions | 55351 | **55352** | **+1** — likely live traffic during migration window |
| ad_clicks | 165 | 165 | Match |
| author_clicks | 60 | 60 | Match |
| section_clicks | 13 | 13 | Match |
| article_scroll_data | 56911 | 56911 | Match |
| diffuse_connections | 3 | 3 | Match |
| diffuse_imported_articles | 15 | 15 | Match |
| hidden_tags | 0 | 0 | Match |

**New tables**

| Table | Expected | Actual |
|--------|----------|--------|
| `tenants` | 1 | 1 (`section_config` length 10) |
| `tenant_newsletter_subscriptions` | 71 (users with `newsletter_subscribed = true`) | 71 |
| `tenant_memberships` | 4 (users with `is_admin` or `is_super_admin`) | 4 |

### Manual review flags

1. **SendGrid alignment** — Confirm seeded `from_email` / `from_name` match production `SENDGRID_*` env vars before relying on DB for email (Phase 3).
2. **`section_config` vs app** — Seed reflects `sections` table names/slugs; may differ from historical `PUBLIC_SECTION_SLUGS` in code (e.g. `latest`, `town-council`). Reconcile in Phase 2–3.
3. **Domain** — Tenant domain stored as `springford.press` (no `www`). Middleware (Phase 2) should normalize hostnames for lookup.
4. **`ad_impressions` +1** — Accept as churn or re-audit if strict lockstep counts are required.

### Rollback (manual)

See rollback comments at the top of the migration SQL file. Order: drop tenant indexes → restore `articles` slug constraint → drop `tenant_id` columns / new tables in dependency order → drop `tenants`.

---

## Phase 2 — middleware + tenant context (complete)

Implemented in repo:

- [`lib/tenant/getTenant.ts`](../lib/tenant/getTenant.ts) — `getTenant(domain)` (React `cache`, service role), `getTenantBySlug`, `getTenantById`, `stripPortFromHost`, `normalizeDomainForLookup`.
- [`middleware.ts`](../middleware.ts) — Host → normalize (port + `www`); localhost / loopback / `*.vercel.app` → `getTenantBySlug('spring-ford')`; else `getTenant(normalized)`; 404 plain text `Site not found` if missing; sets `x-tenant-id` / `x-tenant-slug` on cloned `NextRequest` before [`lib/supabase/middleware.ts`](../lib/supabase/middleware.ts) `updateSession` (admin + auth unchanged).
- [`lib/tenant/getTenantFromHeaders.ts`](../lib/tenant/getTenantFromHeaders.ts) — reads tenant headers; throws if missing.
- [`lib/tenant/TenantProvider.tsx`](../lib/tenant/TenantProvider.tsx) + `useTenant()`.
- [`app/layout.tsx`](../app/layout.tsx) — loads tenant by header id (service role), wraps app with `TenantProvider`.
- [`lib/seo/site.ts`](../lib/seo/site.ts) — adds `getSiteConfig(tenant)`; legacy `SITE_*` exports retained.
- [`components/seo/OrganizationJsonLd.tsx`](../components/seo/OrganizationJsonLd.tsx), [`ArticleJsonLd.tsx`](../components/seo/ArticleJsonLd.tsx) — client components using `useTenant()` for name / URLs.
- [`components/admin/AdminSidebar.tsx`](../components/admin/AdminSidebar.tsx) — `useTenant()` for masthead subtitle.
- [`app/sitemap.ts`](../app/sitemap.ts), [`app/robots.ts`](../app/robots.ts) — tenant from headers + `getSiteConfig` (section slugs from DB `section_config`).

**Manual review:** Sitemap section URLs now follow `tenants.section_config` (10 entries from Phase 1 seed), not the old `PUBLIC_SECTION_SLUGS` list (12). Confirm product intent.

---

## Phase 3 — application layer (not started)

Planned: `getSiteConfig(tenant)`, SendGrid/URL/category updates, dual-write newsletter, tenant-scoped queries, `tenant_memberships` admin checks, additive RLS then remove old policies.

---

## Phase 4 — super-admin tenant UI (not started)

Planned: `/admin/tenants` for `is_super_admin`, create tenant, Vercel domain notice.

---

## Related

- Earlier reconnaissance (pre-migration inventory): Cursor plan `spring-ford_reconnaissance_report_e6e274ec.plan.md` (workspace `.cursor/plans/`).
