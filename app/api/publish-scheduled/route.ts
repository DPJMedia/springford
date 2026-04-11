import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/** Node runtime: cookie-based admin auth for browser; cron uses CRON_SECRET bearer. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Allow: (1) Vercel/manual cron with Authorization: Bearer CRON_SECRET, or
 * (2) logged-in admin (same-origin cookies — ScheduledPublisher in admin).
 */
async function authorize(request: NextRequest): Promise<NextResponse | null> {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth === `Bearer ${cronSecret}`) {
      return null;
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_admin, is_super_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin && !profile?.is_super_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  const denied = await authorize(request);
  if (denied) return denied;

  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const now = new Date().toISOString();

    const h = await headers();
    const tenantFromHeader = h.get("x-tenant-id");

    let articlesQuery = supabase
      .from("articles")
      .select("id, title, scheduled_for")
      .eq("status", "scheduled")
      .lte("scheduled_for", now);

    if (tenantFromHeader) {
      articlesQuery = articlesQuery.eq("tenant_id", tenantFromHeader);
    }

    const { data: scheduledArticles, error: fetchError } = await articlesQuery;

    if (fetchError) {
      console.error("Error fetching scheduled articles:", fetchError);
      return NextResponse.json(
        { success: false, error: fetchError.message },
        { status: 500 }
      );
    }

    if (!scheduledArticles || scheduledArticles.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles due for publishing",
        published_count: 0,
        timestamp: now,
      });
    }

    const publishResults: Array<{
      id: string;
      title: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const article of scheduledArticles) {
      const { error: updateError } = await supabase
        .from("articles")
        .update({
          status: "published",
          published_at: article.scheduled_for,
          updated_at: now,
        })
        .eq("id", article.id);

      if (updateError) {
        console.error(`Error publishing article ${article.id}:`, updateError);
        publishResults.push({
          id: article.id,
          title: article.title,
          success: false,
          error: updateError.message,
        });
      } else {
        publishResults.push({
          id: article.id,
          title: article.title,
          success: true,
        });
      }
    }

    const successCount = publishResults.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      message: `Published ${successCount} article(s)`,
      published_count: successCount,
      results: publishResults,
      timestamp: now,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
