/** Parse YYYY-MM-DD from DB without UTC shifting the calendar day */
function parseDateOnly(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

/** e.g. April 1, 2026 */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = parseDateOnly(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** Campaign window for list + document */
export function formatCampaignRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates not set";
  if (start && end) return `${formatLongDate(start)} – ${formatLongDate(end)}`;
  return formatLongDate(start || end);
}

/** Last saved timestamp — month day, year + time */
export function formatSavedQuoteUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
