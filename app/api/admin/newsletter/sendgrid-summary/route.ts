import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  emptySendGridMetrics,
  mergeMetrics,
  sendGridCategoryForCampaign,
  sumSendGridCategoryStats,
} from "@/lib/newsletter/sendGridCampaign";
import { isSendGridCategoryNotYetRegistered } from "@/lib/newsletter/sendGridStatsFetch";

export const dynamic = "force-dynamic";

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rangeFromTimeRange(tr: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  switch (tr) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    case "all":
      start.setFullYear(start.getFullYear() - 2);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }
  return { start, end };
}

export async function GET(request: Request) {
  try {
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
      .single();
    if (!profile?.is_admin && !profile?.is_super_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    const { start: windowStart, end: windowEnd } = rangeFromTimeRange(timeRange);

    const { data: campaigns, error: listErr } = await supabase
      .from("newsletter_campaigns")
      .select("id, name, sent_at")
      .eq("status", "sent")
      .not("sent_at", "is", null)
      .gte("sent_at", windowStart.toISOString())
      .lte("sent_at", windowEnd.toISOString())
      .order("sent_at", { ascending: false })
      .limit(100);

    if (listErr) {
      return NextResponse.json({ error: listErr.message }, { status: 500 });
    }

    const list = campaigns ?? [];

    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        sendGridError: "SENDGRID_API_KEY is not configured.",
        campaignsInRange: list.length,
        totals: null,
        note: null,
      });
    }
    let merged = emptySendGridMetrics();
    let sendGridError: string | null = null;
    let categories404Only = 0;
    let categoriesWithMetrics = 0;

    // One category per request so a missing category (404) doesn’t fail the whole batch.
    const endStr = dateStr(windowEnd);
    for (const c of list) {
      const cat = sendGridCategoryForCampaign(c.id);
      const start = dateStr(new Date(c.sent_at as string));
      const url = new URL("https://api.sendgrid.com/v3/categories/stats");
      url.searchParams.set("start_date", start);
      url.searchParams.set("end_date", endStr);
      url.searchParams.set("aggregated_by", "day");
      url.searchParams.append("categories", cat);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const text = await res.text();
      if (!res.ok) {
        if (isSendGridCategoryNotYetRegistered(res.status, text)) {
          categories404Only++;
          continue;
        }
        sendGridError = `SendGrid ${res.status}: ${text.slice(0, 300)}`;
        break;
      }
      try {
        const json: unknown = JSON.parse(text) as unknown;
        const part = sumSendGridCategoryStats(json, cat);
        if (part) {
          merged = mergeMetrics(merged, part);
          categoriesWithMetrics++;
        }
      } catch {
        sendGridError = "Could not parse SendGrid stats response.";
        break;
      }
    }

    const statsInfo =
      !sendGridError && list.length > 0 && categoriesWithMetrics === 0 && categories404Only === list.length
        ? "SendGrid has not registered category stats for these sends yet (normal for campaigns sent before category tagging, or until processing finishes). Totals will fill in after tagged sends are processed."
        : null;

    return NextResponse.json({
      campaignsInRange: list.length,
      totals: merged,
      sendGridError,
      statsInfo,
      note:
        "Totals sum per-campaign metrics from SendGrid. Unique opens/clicks may count the same recipient more than once across different campaigns.",
    });
  } catch (e: unknown) {
    console.error("[sendgrid-summary]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
