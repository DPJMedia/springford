import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
import { requireTenantAdmin } from "@/lib/api/requireTenantAdmin";
import { deliverCampaign } from "@/lib/newsletter/deliverCampaign";
import { isSameOriginRequest } from "@/lib/http/sameOrigin";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const tenant = await getTenantForApiRoute();
    const auth = await requireTenantAdmin(tenant.id);
    if (!auth.ok) return auth.response;
    const { campaignId } = await request.json();
    if (typeof campaignId !== "string")
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    const db = createAdminClient();
    const { data: campaign, error } = await db
      .from("newsletter_campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (error || !campaign)
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    if (
      ["all_users", "super_admins"].includes(campaign.recipients_type) &&
      !auth.isSuperAdmin
    )
      return NextResponse.json(
        { error: "Only super admins can send network-wide campaigns" },
        { status: 403 },
      );
    const { recipientCount } = await deliverCampaign(
      db,
      campaign,
      tenant,
      false,
    );
    return NextResponse.json({
      success: true,
      recipientCount,
      sentTo: `${recipientCount} recipients`,
    });
  } catch (error) {
    console.error("Campaign delivery failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not send campaign",
      },
      { status: 409 },
    );
  }
}
