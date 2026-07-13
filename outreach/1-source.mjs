/**
 * Stage 1 — SOURCE
 * Pull local businesses from the Google Places API (New) for each town × category,
 * dedupe by place_id, and write data/raw-<tenant>.json.
 *
 * Usage:
 *   node outreach/1-source.mjs                     # default tenant (spring-ford)
 *   node outreach/1-source.mjs --tenant pottstown-press
 *   node outreach/1-source.mjs --tenant all        # every configured tenant
 *   node outreach/1-source.mjs --dry-run           # no API calls; prints the search plan + est. cost
 */
import { resolve } from "node:path";
import {
  loadEnv, fetchWithTimeout, sleep, writeJson, readJson,
  DATA_DIR, parseArgs, hostOf,
} from "./lib.mjs";
import { TOWNS, CATEGORIES, DEFAULT_TENANT } from "./config.mjs";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id", "places.displayName", "places.formattedAddress",
  "places.websiteUri", "places.nationalPhoneNumber", "places.types",
  "places.businessStatus", "places.rating", "places.userRatingCount",
  "nextPageToken",
].join(",");
const MAX_PAGES = 2; // 20 results/page; 2 pages = up to 40 businesses per town×category

const args = parseArgs();
const tenantArg = args.tenant || DEFAULT_TENANT;

async function searchPlaces(apiKey, textQuery, town, pageToken) {
  const body = {
    textQuery,
    pageSize: 20,
    regionCode: "US",
    locationBias: {
      circle: { center: { latitude: town.lat, longitude: town.lng }, radius: 8000 },
    },
    ...(pageToken ? { pageToken } : {}),
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetchWithTimeout(PLACES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify(body),
    }, 15000);
    if (res && res.ok) return res.json();
    if (res) {
      const errText = await res.text().catch(() => "");
      if (res.status === 429 || res.status >= 500) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
      throw new Error(`Places API ${res.status}: ${errText.slice(0, 300)}`);
    }
    await sleep(1000 * (attempt + 1)); // network failure → retry
  }
  return null;
}

async function main() {
  await loadEnv();
  const tenants = tenantArg === "all"
    ? [...new Set(TOWNS.map((t) => t.tenant))]
    : [tenantArg];
  const towns = TOWNS.filter((t) => tenants.includes(t.tenant));
  if (towns.length === 0) {
    console.error(`No towns configured for tenant "${tenantArg}". Options: ${[...new Set(TOWNS.map((t) => t.tenant))].join(", ")}, all`);
    process.exit(1);
  }

  const plannedRequests = towns.length * CATEGORIES.length * MAX_PAGES;
  console.log(`Tenants:   ${tenants.join(", ")}`);
  console.log(`Towns:     ${towns.length}  |  Categories: ${CATEGORIES.length}  |  Pages/search: ${MAX_PAGES}`);
  console.log(`Max Places requests this run: ~${plannedRequests}  (est. cost well within the $200/mo free credit)\n`);

  if (args["dry-run"]) {
    console.log("DRY RUN — no API calls made. Sample searches:");
    for (const town of towns.slice(0, 2)) {
      for (const cat of CATEGORIES.slice(0, 3)) {
        console.log(`   • "${cat.term} in ${town.name}, ${town.state}"  [${cat.tier}]`);
      }
    }
    return;
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error("Missing GOOGLE_PLACES_API_KEY. Copy outreach/.env.example to outreach/.env and add your key.");
    process.exit(1);
  }
  const maxReq = Number(process.env.MAX_PLACES_REQUESTS || 800);

  for (const tenant of tenants) {
    const tenantTowns = towns.filter((t) => t.tenant === tenant);
    /** @type {Map<string, object>} */
    const byPlaceId = new Map();
    let requests = 0;
    let stopped = false;

    for (const town of tenantTowns) {
      if (stopped) break;
      for (const cat of CATEGORIES) {
        if (stopped) break;
        let pageToken;
        for (let page = 0; page < MAX_PAGES; page++) {
          if (requests >= maxReq) {
            console.log(`\n⚠ Hit MAX_PLACES_REQUESTS (${maxReq}). Stopping early — rerun to continue or raise the cap.`);
            stopped = true;
            break;
          }
          requests++;
          let data;
          try {
            data = await searchPlaces(apiKey, `${cat.term} in ${town.name}, ${town.state}`, town, pageToken);
          } catch (err) {
            console.error(`\n✖ ${err.message}`);
            console.error("  (Common cause: billing not enabled on the Google Cloud project, or Places API (New) not enabled.)");
            process.exit(1);
          }
          const places = data?.places || [];
          for (const p of places) {
            if (!p.id || byPlaceId.has(p.id)) continue;
            if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
            byPlaceId.set(p.id, {
              place_id: p.id,
              business_name: p.displayName?.text || "",
              category: cat.term,
              category_tier: cat.tier,
              town: town.name,
              tenant_target: tenant,
              website: p.websiteUri || "",
              website_host: hostOf(p.websiteUri || ""),
              phone: p.nationalPhoneNumber || "",
              address: p.formattedAddress || "",
              rating: p.rating ?? "",
              review_count: p.userRatingCount ?? 0,
              types: p.types || [],
              business_status: p.businessStatus || "",
            });
          }
          process.stdout.write(`\r[${tenant}] requests: ${requests}  unique businesses: ${byPlaceId.size}   `);
          pageToken = data?.nextPageToken;
          if (!pageToken) break;
          await sleep(300); // be polite to the API
        }
      }
    }

    const rows = [...byPlaceId.values()];
    const outPath = resolve(DATA_DIR, `raw-${tenant}.json`);
    // Merge with any previous run so re-sourcing accumulates instead of overwriting.
    const prev = (await readJson(outPath, [])) || [];
    const merged = new Map(prev.map((r) => [r.place_id, r]));
    for (const r of rows) merged.set(r.place_id, r);
    await writeJson(outPath, [...merged.values()]);
    console.log(`\n✔ [${tenant}] ${rows.length} found this run → ${merged.size} total → ${outPath}\n`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
