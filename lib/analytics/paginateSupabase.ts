/**
 * PostgREST (Supabase) returns at most 1000 rows per request by default.
 * Charts and geo aggregates that only read the first page silently miss newer rows
 * once total matching rows exceed 1000 — dashboards look "frozen" after a certain date.
 */
const PAGE_SIZE = 1000;
const MAX_PAGE_RETRIES = 4;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function errorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
    return (err as { message: string }).message;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Fetches all rows for a query built with .order() and .range(from, to).
 * Pass an async function that awaits the Supabase query (the builder must be awaited).
 *
 * - Retries transient failures (network / "Failed to fetch") with backoff.
 * - Does not throw: returns partial rows if a page fails after retries (avoids Next.js error overlay).
 */
export async function fetchAllRowsPaginated<T>(
  runPage: (from: number, to: number) => Promise<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;
    let page: T[] | null = null;
    let pageError: string | null = null;

    for (let attempt = 0; attempt < MAX_PAGE_RETRIES; attempt++) {
      try {
        const { data, error } = await runPage(from, to);
        if (error) {
          pageError = error.message || String(error);
          await sleep(250 * 2 ** attempt);
          continue;
        }
        page = data ?? [];
        pageError = null;
        break;
      } catch (e) {
        pageError = errorMessage(e);
        await sleep(250 * 2 ** attempt);
      }
    }

    if (pageError) {
      console.warn(
        "[analytics] page_views fetch stopped after retries (showing partial data):",
        pageError,
        { from, rowsLoaded: out.length },
      );
      return out;
    }

    if (!page?.length) break;
    out.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return out;
}
