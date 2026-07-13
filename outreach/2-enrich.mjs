/**
 * Stage 2 — ENRICH
 * For each sourced business that has a real website, fetch its homepage and a few
 * likely contact pages, and extract contact email(s). Writes data/enriched-<tenant>.json.
 *
 * Resumable: businesses already enriched in a previous run are skipped, so you can
 * re-run after adding leads without re-crawling everything.
 *
 * Usage:
 *   node outreach/2-enrich.mjs --tenant spring-ford
 *   node outreach/2-enrich.mjs --tenant all
 */
import { resolve } from "node:path";
import {
  loadEnv, fetchWithTimeout, pMap, extractEmails, writeJson, readJson,
  DATA_DIR, parseArgs,
} from "./lib.mjs";
import { TOWNS, DEFAULT_TENANT } from "./config.mjs";

const CONTACT_PATHS = ["", "/contact", "/contact-us", "/about", "/about-us"];
const SKIP_HOSTS = ["facebook.com", "instagram.com", "yelp.com", "twitter.com", "x.com", "linktr.ee", "google.com"];
const UA = "Mozilla/5.0 (compatible; DPJMediaOutreach/1.0; local advertising research)";

const args = parseArgs();
const tenantArg = args.tenant || DEFAULT_TENANT;

async function scrapeSite(lead) {
  const host = lead.website_host;
  const channel = SKIP_HOSTS.find((h) => host.endsWith(h)) ? "social" : "website";
  if (!lead.website || channel === "social") {
    return { ...lead, email: "", all_emails: [], contact_channel: lead.website ? "social" : "none" };
  }

  const seen = new Set();
  for (const path of CONTACT_PATHS) {
    let url;
    try {
      url = new URL(path, lead.website).href;
    } catch {
      continue;
    }
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA }, redirect: "follow" }, 9000);
    if (!res || !res.ok) continue;
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("html")) continue;
    const html = await res.text().catch(() => "");
    for (const e of extractEmails(html, host)) seen.add(e);
    if ([...seen].some((e) => ["info", "contact", "hello", "office"].includes(e.split("@")[0]))) break; // good enough
  }

  const all = [...seen];
  return { ...lead, email: all[0] || "", all_emails: all, contact_channel: "website" };
}

async function main() {
  await loadEnv();
  const tenants = tenantArg === "all"
    ? [...new Set(TOWNS.map((t) => t.tenant))]
    : [tenantArg];

  for (const tenant of tenants) {
    const rawPath = resolve(DATA_DIR, `raw-${tenant}.json`);
    const raw = await readJson(rawPath, null);
    if (!raw) {
      console.error(`No sourced data for "${tenant}" (${rawPath}). Run 1-source.mjs first.`);
      continue;
    }
    const outPath = resolve(DATA_DIR, `enriched-${tenant}.json`);
    const prev = (await readJson(outPath, [])) || [];
    const prevById = new Map(prev.map((r) => [r.place_id, r]));

    const todo = raw.filter((r) => !prevById.has(r.place_id));
    console.log(`[${tenant}] ${raw.length} sourced  |  ${prev.length} already enriched  |  ${todo.length} to crawl`);
    if (todo.length === 0) { console.log("  nothing new — skipping.\n"); continue; }

    let done = 0;
    const enriched = await pMap(todo, async (lead) => {
      const out = await scrapeSite(lead);
      done++;
      if (done % 10 === 0 || done === todo.length) {
        process.stdout.write(`\r  crawled ${done}/${todo.length}   `);
      }
      return out;
    }, 12);

    const merged = new Map(prevById);
    for (const r of enriched) merged.set(r.place_id, r);
    const all = [...merged.values()];
    const withEmail = all.filter((r) => r.email).length;
    await writeJson(outPath, all);
    console.log(`\n✔ [${tenant}] ${all.length} enriched  |  ${withEmail} have an email  →  ${outPath}\n`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
