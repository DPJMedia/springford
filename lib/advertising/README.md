# Advertisement quoter

- **Model:** `quoteModel.ts` — line-item baseline dollars × **one** traffic index (from last-30-day **total** site page views).
- **Rate card:** `RATES_USD` is **stable** until you change it; it does not auto-scale line-by-line every day. Homepage/main placements &lt; article placements; desktop article &lt; mobile article (mobile article = premium tier).
- **Traffic index:** `viewershipMultiplier(monthlySiteViews)` applies to the **whole** subtotal (not per line item).
- **View mix (optional):** When `homepageViews` + `articleViews` from analytics are passed in, `computeEffectiveRates` may apply a **small** extra bump to **desktop + mobile article** row rates only (homepage rows stay fixed for calibration). Shown as `viewMixNote` on the quote.
- **Site placements:** **Yes/no per surface** for the **full campaign** (`durationMonths`). When enabled, billing is **per month × campaign length** at the monthly rate (same total as “N months” before, without asking for N separately). Surfaces: desktop main, mobile main, desktop article, mobile article.
- **Baseline traffic:** `BASELINE_MONTHLY_SITE_VIEWS` (12,000) ≈ index **1.0**.
- **Policy caps:** Newsletter sends **max 8/mo**; newsletter spotlight sections **max 2/mo** (campaign cap = 2 × months); sponsored articles **max 1/mo per advertiser** (cap = campaign months). Enforced in `sanitizePackage` / `fillPackageToBaselineBudget`.
- **Calibration:** Reference 3-month bundle ≈ **$1,100** at index 1.0 (`REFERENCE_DEAL_PRESET`).
- **Saved quotes:** Table `saved_ad_quotes` (see migrations) stores `package_data` JSON, client, dates, snapshot totals — admin-only RLS.

Adjust `RATES_USD` when real pricing changes.
