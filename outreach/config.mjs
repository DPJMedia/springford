/**
 * Outreach pipeline configuration.
 *
 * TOWNS are grouped by the tenant site whose readers live there, so every lead
 * is tagged with the paper we'd pitch it for. Coordinates are approximate town
 * centers (used only as a light location bias for the Places search).
 *
 * CATEGORIES are local business types, tiered by how much they typically spend
 * on local advertising. Tier weight feeds the lead score in 3-export.mjs.
 */

/** @typedef {{ name: string, state: string, tenant: string, lat: number, lng: number }} Town */

/** Which tenant to source when no --tenant flag is passed. */
export const DEFAULT_TENANT = "spring-ford";

/** @type {Town[]} */
export const TOWNS = [
  // --- Spring-Ford Press coverage (the established, sellable site) ---
  { name: "Royersford", state: "PA", tenant: "spring-ford", lat: 40.1842, lng: -75.5388 },
  { name: "Spring City", state: "PA", tenant: "spring-ford", lat: 40.1762, lng: -75.5477 },
  { name: "Limerick", state: "PA", tenant: "spring-ford", lat: 40.2337, lng: -75.5346 },
  { name: "Collegeville", state: "PA", tenant: "spring-ford", lat: 40.1859, lng: -75.4527 },
  { name: "Trappe", state: "PA", tenant: "spring-ford", lat: 40.1968, lng: -75.4763 },
  { name: "Schwenksville", state: "PA", tenant: "spring-ford", lat: 40.2565, lng: -75.4649 },
  { name: "Oaks", state: "PA", tenant: "spring-ford", lat: 40.1354, lng: -75.4483 },

  // --- Pottstown Press coverage (new site; "founding sponsor" pitch) ---
  { name: "Pottstown", state: "PA", tenant: "pottstown-press", lat: 40.2454, lng: -75.6496 },
  { name: "Stowe", state: "PA", tenant: "pottstown-press", lat: 40.2565, lng: -75.6663 },
  { name: "Sanatoga", state: "PA", tenant: "pottstown-press", lat: 40.2521, lng: -75.5988 },
  { name: "Boyertown", state: "PA", tenant: "pottstown-press", lat: 40.3337, lng: -75.6377 },
  { name: "Gilbertsville", state: "PA", tenant: "pottstown-press", lat: 40.3229, lng: -75.6019 },

  // --- Phoenixville Press coverage (new site; "founding sponsor" pitch) ---
  { name: "Phoenixville", state: "PA", tenant: "phoenixville-press", lat: 40.1304, lng: -75.5149 },
  { name: "Kimberton", state: "PA", tenant: "phoenixville-press", lat: 40.1362, lng: -75.5710 },
  { name: "Mont Clare", state: "PA", tenant: "phoenixville-press", lat: 40.1370, lng: -75.5013 },
];

/**
 * Local business categories to search, with an advertising-spend tier:
 *   high = 3  (auto, real estate, medical, home services, legal, finance — big local ad budgets)
 *   mid  = 2  (restaurants, fitness, salons, retail — regular but smaller spend)
 *   low  = 1  (everything else worth a shot)
 * `term` is the search phrase; the town + ", PA" is appended at search time.
 */
export const CATEGORIES = [
  // High-LTV
  { term: "auto repair shop", tier: "high" },
  { term: "car dealership", tier: "high" },
  { term: "HVAC contractor", tier: "high" },
  { term: "plumber", tier: "high" },
  { term: "roofing contractor", tier: "high" },
  { term: "electrician", tier: "high" },
  { term: "landscaping company", tier: "high" },
  { term: "home remodeling contractor", tier: "high" },
  { term: "real estate agency", tier: "high" },
  { term: "law firm", tier: "high" },
  { term: "dentist", tier: "high" },
  { term: "orthodontist", tier: "high" },
  { term: "chiropractor", tier: "high" },
  { term: "urgent care clinic", tier: "high" },
  { term: "insurance agency", tier: "high" },
  { term: "financial advisor", tier: "high" },
  { term: "veterinarian", tier: "high" },
  { term: "funeral home", tier: "high" },
  { term: "med spa", tier: "high" },

  // Mid-LTV
  { term: "restaurant", tier: "mid" },
  { term: "cafe", tier: "mid" },
  { term: "gym", tier: "mid" },
  { term: "hair salon", tier: "mid" },
  { term: "day spa", tier: "mid" },
  { term: "pet grooming", tier: "mid" },
  { term: "florist", tier: "mid" },
  { term: "jewelry store", tier: "mid" },
  { term: "childcare center", tier: "mid" },
  { term: "bakery", tier: "mid" },
  { term: "catering company", tier: "mid" },
  { term: "dance studio", tier: "mid" },

  // Low-LTV (broad sweep)
  { term: "boutique", tier: "low" },
  { term: "hardware store", tier: "low" },
];

export const TIER_WEIGHT = { high: 3, mid: 1, low: 0 };
