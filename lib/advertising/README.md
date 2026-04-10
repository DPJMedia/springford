# Advertisement quoter

## Package quoter (v2) — current

- **Model:** `packageQuoterModel.ts` — six fixed packages (slots + list price + impressions), optional add-ons, campaign length 1–3 months.
- **Traffic index:** Same `viewershipMultiplier` as `quoteModel.ts` (trailing 30-day **total** `page_views`). At or below **25,000** views/mo, package price equals the published list (no discount). Above baseline, package price = list × `multiplier(views)/multiplier(25k)`. **Add-ons are never indexed.**
- **CPM (live):** Indexed package price ÷ package impression count × 1,000.
- **UI:** `app/admin/ad-quoter/page.tsx`.
- **Saved quotes:** `saved_ad_quotes.package_data` with `quoterVersion: 2` and `{ packageId, campaignMonths, addOns }`.

## Legacy line-item model (still in `quoteModel.ts`)

Older saved quotes use `packageFromJson` / `computeQuote` (line items × one traffic index, optional homepage/article mix nudge). Not used for new quotes.
