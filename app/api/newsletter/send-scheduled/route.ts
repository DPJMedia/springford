import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantById } from "@/lib/tenant/getTenant";
import { deliverCampaign } from "@/lib/newsletter/deliverCampaign";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Scheduler is not configured" },
      { status: 503 },
    );
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createAdminClient();
  const { data: campaigns, error } = await db
    .from("newsletter_campaigns")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at")
    .limit(5);
  if (error)
    return NextResponse.json(
      { error: "Could not load campaigns" },
      { status: 503 },
    );
  const results = [];
  for (const campaign of campaigns ?? []) {
    try {
      const tenant = campaign.tenant_id
        ? await getTenantById(campaign.tenant_id)
        : null;
      if (!tenant) throw new Error("Campaign has no active publication");
      results.push({
        id: campaign.id,
        success: true,
        ...(await deliverCampaign(db, campaign, tenant, true)),
      });
    } catch (error) {
      console.error("Scheduled newsletter failed", campaign.id, error);
      results.push({
        id: campaign.id,
        success: false,
        error: error instanceof Error ? error.message : "Delivery failed",
      });
    }
  }
  return NextResponse.json({
    success: results.every((r) => r.success),
    sent: results.filter((r) => r.success).length,
    results,
  });
}
