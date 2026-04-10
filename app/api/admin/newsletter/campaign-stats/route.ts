import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  sendGridCategoryForCampaign,
  sumSendGridCategoryStats,
  type SendGridCategoryMetrics,
} from "@/lib/newsletter/sendGridCampaign";
import { isSendGridCategoryNotYetRegistered } from "@/lib/newsletter/sendGridStatsFetch";

export const dynamic = "force-dynamic";

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
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
    const campaignId = searchParams.get("campaignId");
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const { data: campaign, error: campErr } = await supabase
      .from("newsletter_campaigns")
      .select("id, name, subject, status, sent_at, recipient_count")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const apiKey = process.env.SENDGRID_API_KEY;
    const categoryTag = sendGridCategoryForCampaign(campaignId);

    let aggregate: SendGridCategoryMetrics | null = null;
    let sendGridError: string | null = null;
    /** Friendly copy when SendGrid has no category row yet (not a failure). */
    let statsInfo: string | null = null;

    if (apiKey && campaign.status === "sent" && campaign.sent_at) {
      const sent = new Date(campaign.sent_at);
      const start = dateStr(sent);
      const end = dateStr(new Date());
      const url = new URL("https://api.sendgrid.com/v3/categories/stats");
      url.searchParams.set("start_date", start);
      url.searchParams.set("end_date", end);
      url.searchParams.set("aggregated_by", "day");
      url.searchParams.append("categories", categoryTag);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const t = await res.text();
      if (!res.ok) {
        if (isSendGridCategoryNotYetRegistered(res.status, t)) {
          statsInfo =
            "SendGrid has no statistics for this campaign’s category yet. That usually means either this send went out before we started tagging emails with categories, or SendGrid hasn’t finished processing the send (try again in a few hours). The next send after deploy will create the category automatically.";
        } else {
          sendGridError = `SendGrid ${res.status}: ${t.slice(0, 500)}`;
        }
      } else {
        try {
          const json: unknown = JSON.parse(t) as unknown;
          aggregate = sumSendGridCategoryStats(json, categoryTag);
        } catch {
          sendGridError = "Could not parse SendGrid stats response.";
        }
        if (aggregate == null && !sendGridError) {
          statsInfo =
            "No metric rows returned for this category yet. If the campaign just sent, check back after SendGrid finishes processing.";
        }
      }
    } else if (!apiKey) {
      sendGridError = "SENDGRID_API_KEY is not configured.";
    } else if (campaign.status !== "sent" || !campaign.sent_at) {
      statsInfo = "Send a campaign first; aggregate stats appear after the send is processed by SendGrid.";
    }

    const { data: events, error: evErr } = await supabase
      .from("newsletter_email_events")
      .select("id, email, event, url, reason, occurred_at")
      .eq("campaign_id", campaignId)
      .order("occurred_at", { ascending: false })
      .limit(500);

    if (evErr) {
      console.warn("[campaign-stats] events query:", evErr.message);
    }

    return NextResponse.json({
      campaign,
      categoryTag,
      aggregate,
      sendGridError,
      statsInfo,
      webhookConfiguredHint:
        !events?.length && aggregate == null && !statsInfo?.includes("before we started tagging")
          ? "For opens/clicks per subscriber, add SendGrid’s Event Webhook to /api/webhooks/sendgrid (optional token)."
          : null,
      events: events ?? [],
      eventsError: evErr?.message ?? null,
    });
  } catch (e: unknown) {
    console.error("[campaign-stats]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
