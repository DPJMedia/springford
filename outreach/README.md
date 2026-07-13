# DPJ Media — Advertiser Outreach & Lead Pipeline

A small command-line pipeline that builds a **qualified local-business lead list** for each
news site, so your salesperson has a steady stream of advertisers to contact.

**It is not a website and it is not hosted anywhere.** It's three Node scripts you run on
your own machine. They pull local businesses from Google, find their contact emails, score
each one, and produce a **CSV you open in Google Sheets or Airtable**. It never touches or
slows down the live news site (`.mjs` files are excluded from the Next.js build).

---

## How it works (3 stages)

```
1-source.mjs   Google Places API ──▶ data/raw-<tenant>.json      (businesses by town × category)
2-enrich.mjs   crawl each website ──▶ data/enriched-<tenant>.json  (adds contact emails)
3-export.mjs   score A/B/C + CSV  ──▶ output/leads-<tenant>-<date>.csv   ◀── give this to sales
```

- **Tenant-aware:** every lead is tagged with the paper it belongs to (`spring-ford`,
  `pottstown-press`, `phoenixville-press`) based on which town it's in. Configure towns and
  business categories in [`config.mjs`](config.mjs).
- **Resumable:** re-running accumulates instead of overwriting, and stage 2 skips businesses
  it already crawled — so you can grow the list over time without redoing work.
- **Safe/cheap:** Google Places (New) gives a **$200/month free credit**; a full Spring-Ford
  run uses only a few dollars of it. `MAX_PLACES_REQUESTS` in `.env` is a hard safety cap.

---

## One-time setup

1. **Get a Google Places API key** (free credit covers us):
   - Go to <https://console.cloud.google.com/> and create a project (e.g. "DPJ Outreach").
   - **APIs & Services → Library →** search **"Places API (New)"** → **Enable**.
   - **APIs & Services → Credentials → Create credentials → API key** → copy it.
   - Make sure **billing is enabled** on the project (required even to use the free credit —
     you won't be charged inside the $200/mo).
2. **Add the key locally:**
   ```bash
   cp outreach/.env.example outreach/.env
   # then open outreach/.env and paste your key after GOOGLE_PLACES_API_KEY=
   ```
   `.env` is gitignored — your key is never committed.

That's the only setup. No `npm install` — the scripts use built-in Node only.

---

## Running it

```bash
# 0. (optional) preview the search plan without spending anything
node outreach/1-source.mjs --dry-run

# 1. pull businesses for the Spring-Ford towns
node outreach/1-source.mjs --tenant spring-ford

# 2. find their contact emails
node outreach/2-enrich.mjs --tenant spring-ford

# 3. score + export the CSV
node outreach/3-export.mjs --tenant spring-ford
#    → outreach/output/leads-spring-ford-<date>.csv
```

Other options:
- `--tenant all` on any stage runs every configured site.
- `--tenant pottstown-press` / `--tenant phoenixville-press` for the new sites.
- `node outreach/3-export.mjs --tenant spring-ford --min-tier B` exports only A + B leads.

---

## The output CSV

One row per business, best prospects first. Key columns:

| Column | Meaning |
|---|---|
| `tier` / `score` | A/B/C prospect quality (A = has site + email + high-spend category + established) |
| `business_name`, `category`, `town`, `tenant_target` | who they are and which paper to pitch |
| `email`, `all_emails`, `phone`, `website` | how to reach them |
| `rating`, `review_count` | how established they are |
| `status` | pipeline stage — **the salesperson updates this**: `new → contacted → opened → replied → meeting → won → lost` |
| `contact_name`, `first_contacted_at`, `last_touch`, `notes` | blank columns for the salesperson to work in |

Import it into Google Sheets (File → Import) or Airtable (paste/CSV import). The `status`
column is your CRM — filter on it to see who to follow up with.

**Scoring:** website +2, email +3, category tier (high +3 / mid +1), established (≥50 reviews +2,
≥10 +1). Tier A ≥ 8, B 5–7, C < 5. Tune the weights in [`3-export.mjs`](3-export.mjs).

---

## Sending the outreach

Draft email sequences live in [`sequences/`](sequences/). **Do not send cold outreach from
`admin@dpjmedia.com`** — that's your newsletter/receipt sender and cold email would hurt its
deliverability. Use a separate domain + inbox (see the sequence file's header note).

Recommended flow: start by hand-sending 20–30/day of the personalized Tier-A leads from a
dedicated inbox to validate the messaging, then scale with a cold-email tool once it converts.
