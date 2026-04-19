import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const campaignId = body?.campaignId as string | undefined;
    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }

    const { data: campaign, error: fetchErr } = await supabase
      .from("newsletter_campaigns")
      .select("id, status")
      .eq("id", campaignId)
      .single();

    if (fetchErr || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "scheduled") {
      return NextResponse.json(
        { error: "Only scheduled campaigns can be canceled" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from("newsletter_campaigns")
      .update({
        status: "canceled",
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .eq("status", "scheduled")
      .select("id");

    if (updateErr) {
      console.error("[cancel-scheduled] update error:", updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    if (!updated?.length) {
      return NextResponse.json(
        { error: "Could not cancel — it may have already sent or been canceled." },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[cancel-scheduled]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
