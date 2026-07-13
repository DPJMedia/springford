/**
 * Stage 3 — SCORE & EXPORT
 * Score each enriched lead A/B/C by likelihood-to-advertise and write a clean CSV
 * (ready to import into Google Sheets or Airtable) to output/leads-<tenant>-<date>.csv.
 *
 * Scoring (higher = better prospect):
 *   + website found ............ +2
 *   + contact email found ...... +3
 *   + category tier ............ high +3 / mid +1 / low 0
 *   + established (reviews) ..... >=50 → +2, >=10 → +1
 *   Tier A: >= 8   Tier B: 5-7   Tier C: < 5
 *
 * Usage:
 *   node outreach/3-export.mjs --tenant spring-ford
 *   node outreach/3-export.mjs --tenant all
 *   node outreach/3-export.mjs --tenant spring-ford --min-tier B   # only export A+B
 */
import { resolve } from "node:path";
import {
  loadEnv, readJson, toCsv, writeJson, ensureDir,
  DATA_DIR, OUTPUT_DIR, parseArgs,
} from "./lib.mjs";
import { TOWNS, DEFAULT_TENANT, TIER_WEIGHT } from "./config.mjs";

const args = parseArgs();
const tenantArg = args.tenant || DEFAULT_TENANT;
const minTier = String(args["min-tier"] || "C").toUpperCase();
const TIER_RANK = { A: 3, B: 2, C: 1 };

const CSV_COLUMNS = [
  "tier", "score", "business_name", "category", "category_tier", "town", "tenant_target",
  "email", "all_emails", "phone", "website", "contact_channel",
  "rating", "review_count", "address", "place_id",
  "contact_name", "status", "first_contacted_at", "last_touch", "notes",
];

function scoreLead(lead) {
  let s = 0;
  if (lead.website) s += 2;
  if (lead.email) s += 3;
  s += TIER_WEIGHT[lead.category_tier] ?? 0;
  const reviews = Number(lead.review_count) || 0;
  if (reviews >= 50) s += 2;
  else if (reviews >= 10) s += 1;
  const tier = s >= 8 ? "A" : s >= 5 ? "B" : "C";
  return { score: s, tier };
}

function toRow(lead) {
  const { score, tier } = scoreLead(lead);
  return {
    tier, score,
    business_name: lead.business_name,
    category: lead.category,
    category_tier: lead.category_tier,
    town: lead.town,
    tenant_target: lead.tenant_target,
    email: lead.email || "",
    all_emails: (lead.all_emails || []).join(" | "),
    phone: lead.phone || "",
    website: lead.website || "",
    contact_channel: lead.contact_channel || "",
    rating: lead.rating ?? "",
    review_count: lead.review_count ?? 0,
    address: lead.address || "",
    place_id: lead.place_id,
    contact_name: "",           // filled by the salesperson
    status: "new",              // new → contacted → opened → replied → meeting → won → lost
    first_contacted_at: "",
    last_touch: "",
    notes: "",
  };
}

async function main() {
  await loadEnv();
  await ensureDir(OUTPUT_DIR);
  const tenants = tenantArg === "all"
    ? [...new Set(TOWNS.map((t) => t.tenant))]
    : [tenantArg];
  const stamp = new Date().toISOString().slice(0, 10);

  for (const tenant of tenants) {
    const enrichedPath = resolve(DATA_DIR, `enriched-${tenant}.json`);
    const enriched = await readJson(enrichedPath, null);
    if (!enriched) {
      console.error(`No enriched data for "${tenant}" (${enrichedPath}). Run 2-enrich.mjs first.`);
      continue;
    }

    const rows = enriched
      .map(toRow)
      .filter((r) => (TIER_RANK[r.tier] || 0) >= (TIER_RANK[minTier] || 1))
      .sort((a, b) => b.score - a.score || a.business_name.localeCompare(b.business_name));

    const counts = { A: 0, B: 0, C: 0 };
    for (const r of rows) counts[r.tier]++;
    const withEmail = rows.filter((r) => r.email).length;

    const csvPath = resolve(OUTPUT_DIR, `leads-${tenant}-${stamp}.csv`);
    await ensureDir(OUTPUT_DIR);
    await writeJson(resolve(OUTPUT_DIR, `leads-${tenant}-${stamp}.json`), rows);
    const fs = await import("node:fs/promises");
    await fs.writeFile(csvPath, toCsv(rows, CSV_COLUMNS));

    console.log(`\n[${tenant}]  exported ${rows.length} leads  (A: ${counts.A}, B: ${counts.B}, C: ${counts.C})  |  ${withEmail} with email`);
    console.log(`  CSV → ${csvPath}`);
    console.log(`  Import this straight into Google Sheets or Airtable.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
