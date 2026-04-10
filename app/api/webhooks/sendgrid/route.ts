import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SgEvent = {
  email?: string;
  event?: string;
  timestamp?: number;
  url?: string;
  reason?: string;
  sg_event_id?: string;
  campaign_id?: string;
  [key: string]: unknown;
};

export async function POST(request: Request) {
  const token = process.env.SENDGRID_WEBHOOK_TOKEN;
  const url = new URL(request.url);
  if (token && url.searchParams.get("token") !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const urlSupabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!urlSupabase || !serviceKey) {
    console.error("[sendgrid webhook] Missing Supabase env");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events: SgEvent[] = Array.isArray(body) ? body : [];
  const supabase = createClient(urlSupabase, serviceKey);

  let inserted = 0;
  let skipped = 0;

  for (const ev of events) {
    const campaignIdRaw =
      typeof ev.campaign_id === "string"
        ? ev.campaign_id
        : typeof (ev as { custom_args?: { campaign_id?: string } }).custom_args?.campaign_id === "string"
          ? (ev as { custom_args: { campaign_id: string } }).custom_args.campaign_id
          : null;

    if (!campaignIdRaw || !UUID_RE.test(campaignIdRaw)) {
      skipped++;
      continue;
    }

    const email = typeof ev.email === "string" ? ev.email : null;
    const eventName = typeof ev.event === "string" ? ev.event : "unknown";
    if (!email) {
      skipped++;
      continue;
    }

    const tsSec = typeof ev.timestamp === "number" ? ev.timestamp : Date.now() / 1000;
    const occurredAt = new Date(tsSec * 1000).toISOString();
    const urlVal = typeof ev.url === "string" ? ev.url : null;
    const reason =
      typeof ev.reason === "string"
        ? ev.reason
        : typeof ev.status === "string"
          ? ev.status
          : null;
    const sgEventId = typeof ev.sg_event_id === "string" ? ev.sg_event_id : null;

    const row = {
      campaign_id: campaignIdRaw,
      email,
      event: eventName,
      url: urlVal,
      reason,
      sg_event_id: sgEventId,
      occurred_at: occurredAt,
      raw: ev as object,
    };

    const { error } = await supabase.from("newsletter_email_events").insert(row);

    if (error) {
      if (error.code === "23505" || error.message?.includes("duplicate")) {
        skipped++;
        continue;
      }
      console.error("[sendgrid webhook] insert error:", error);
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ ok: true, processed: events.length, inserted, skipped });
}
