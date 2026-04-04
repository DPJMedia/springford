import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

function computeRange(timeRange: string) {
  const now = new Date();
  const endIso = now.toISOString();
  const startDate = new Date();
  switch (timeRange) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(now.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    default:
      startDate.setTime(new Date("2020-01-01").getTime());
  }
  return { rangeStartIso: startDate.toISOString(), rangeEndIso: endIso };
}

function computeChart(chartTimeRange: string) {
  const now = new Date();
  const chartEndIso = now.toISOString();
  const chartStartDate = new Date();
  let bucketCount = 7;
  let granularity: "hour" | "day" = "day";
  switch (chartTimeRange) {
    case "24h":
      chartStartDate.setHours(now.getHours() - 24);
      bucketCount = 24;
      granularity = "hour";
      break;
    case "7d":
      chartStartDate.setDate(now.getDate() - 7);
      bucketCount = 7;
      break;
    case "30d":
      chartStartDate.setDate(now.getDate() - 30);
      bucketCount = 30;
      break;
    case "90d":
      chartStartDate.setDate(now.getDate() - 90);
      bucketCount = 90;
      break;
    default:
      chartStartDate.setDate(now.getDate() - 7);
      bucketCount = 7;
  }
  return {
    chartStartIso: chartStartDate.toISOString(),
    chartEndIso,
    granularity,
    bucketCount,
  };
}

async function loadCurrentAdsStats(supabase: SupabaseClient, nowIso: string) {
  const now = new Date(nowIso);
  const { data: assignments } = await supabase
    .from("ad_slot_assignments")
    .select("ad_id, ad_slot, ads!inner(id, title, start_date, end_date, is_active)");
  const activeAssignments = (assignments || []).filter((a: Record<string, unknown>) => {
    const ad = a.ads as { is_active?: boolean; start_date: string; end_date: string } | undefined;
    if (!ad) return false;
    return (
      ad.is_active !== false &&
      new Date(ad.start_date) <= now &&
      new Date(ad.end_date || 0) >= now
    );
  });
  let currentAdSlots: { ad_id: string; ad_slot: string; title: string | null; start_date: string }[] = [];
  if (activeAssignments.length > 0) {
    currentAdSlots = activeAssignments.map((a: Record<string, unknown>) => {
      const ad = a.ads as { title?: string | null; start_date?: string };
      return {
        ad_id: a.ad_id as string,
        ad_slot: a.ad_slot as string,
        title: ad?.title ?? null,
        start_date: ad?.start_date ?? new Date(0).toISOString(),
      };
    });
  } else {
    const { data: legacyAds } = await supabase
      .from("ads")
      .select("id, title, start_date, ad_slot")
      .eq("is_active", true)
      .lte("start_date", nowIso)
      .gte("end_date", nowIso);
    legacyAds?.forEach((ad: { id: string; title: string | null; start_date: string; ad_slot: string | null }) => {
      currentAdSlots.push({
        ad_id: ad.id,
        ad_slot: ad.ad_slot || "unknown",
        title: ad.title,
        start_date: ad.start_date,
      });
    });
  }
  return Promise.all(
    currentAdSlots.map(async (row) => {
      const { count: impCount } = await supabase
        .from("ad_impressions")
        .select("*", { count: "exact", head: true })
        .eq("ad_id", row.ad_id)
        .eq("ad_slot", row.ad_slot)
        .gte("viewed_at", row.start_date);
      const { count: clickCount } = await supabase
        .from("ad_clicks")
        .select("*", { count: "exact", head: true })
        .eq("ad_id", row.ad_id)
        .eq("ad_slot", row.ad_slot)
        .gte("clicked_at", row.start_date);
      const impressions = impCount ?? 0;
      const clicks = clickCount ?? 0;
      return {
        name: row.title || "Untitled",
        ad_slot: row.ad_slot,
        impressions,
        clicks,
        ctr: impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0.00",
      };
    }),
  );
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get("timeRange") || "30d";
    const chartTimeRange = searchParams.get("chartTimeRange") || "7d";

    const { rangeStartIso, rangeEndIso } = computeRange(timeRange);
    const { chartStartIso, chartEndIso, granularity, bucketCount } = computeChart(chartTimeRange);

    const admin = createAdminClient();
    const { data: rpcData, error: rpcError } = await admin.rpc("get_admin_analytics_dashboard", {
      p_range_start: rangeStartIso,
      p_range_end: rangeEndIso,
      p_chart_start: chartStartIso,
      p_chart_end: chartEndIso,
      p_chart_granularity: granularity,
      p_chart_bucket_count: bucketCount,
    });

    if (rpcError) {
      console.error("[analytics-dashboard] RPC error:", rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    const currentAdsStats = await loadCurrentAdsStats(admin, rangeEndIso);

    return NextResponse.json({
      ...rpcData,
      chartGranularity: granularity,
      currentAdsStats,
    });
  } catch (e) {
    console.error("[analytics-dashboard]", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
