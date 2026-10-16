import { consumeRateLimit } from "@/lib/rate-limit-server";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
import { isSameOriginRequest } from "@/lib/http/sameOrigin";
import { allowRateLimit, getClientIp } from "@/lib/rate-limit";

const COOKIE = "press_analytics_session";
const sign = (id: string) =>
  createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .update(`analytics:${id}`)
    .digest("base64url");
function session(request: NextRequest): string | null {
  const [id, signature] = (request.cookies.get(COOKIE)?.value ?? "").split(".");
  if (!id || !signature || !z.string().uuid().safeParse(id).success)
    return null;
  const expected = Buffer.from(sign(id));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected)
    ? id
    : null;
}
export async function GET(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return new NextResponse(null, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return new NextResponse(null, { status: 503 });
  const id = session(request) ?? randomUUID();
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(COOKIE, `${id}.${sign(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 31536000,
  });
  return response;
}
const str = z.string().max(2048);
const optional = str.nullable().optional();
const uuid = z.string().uuid().nullable().optional();
const number = z.number().finite().min(0).max(1e9);
const percent = z.number().finite().min(0).max(100);
const common = {
  article_id: uuid,
  ad_id: uuid,
  ad_slot: z.string().max(200).optional(),
  session_id: optional,
  user_id: uuid,
  tenant_id: uuid,
  device_type: z.enum(["mobile", "tablet", "desktop"]).optional(),
  city: optional,
  state: optional,
  country: optional,
  postal_code: optional,
};
const schemas = {
  page_views: z.object({
    ...common,
    view_type: z.enum([
      "article",
      "homepage",
      "section",
      "author",
      "tag",
      "other",
    ]),
    referrer_url: optional,
    traffic_source: optional,
    utm_source: optional,
    utm_medium: optional,
    utm_campaign: optional,
    user_agent: optional,
    viewed_at: z.string().datetime().optional(),
  }),
  page_view_update: z.object({
    article_id: uuid,
    time_spent_seconds: number,
    scroll_depth_percent: percent,
    max_scroll_depth: number,
    completed_article: z.boolean(),
  }),
  article_scroll_data: z.object({
    ...common,
    scroll_checkpoints: z
      .record(z.string(), z.number().finite())
      .refine((v) => Object.keys(v).length <= 20),
    max_scroll_percent: percent,
    article_length_pixels: number,
    time_spent_seconds: number,
    abandoned_at_percent: percent,
  }),
  ad_impressions: z.object({
    ...common,
    page_url: optional,
    was_viewed: z.boolean(),
    view_duration_seconds: number,
    viewport_position: optional,
    scroll_depth_when_viewed: percent.nullable().optional(),
  }),
  ad_clicks: z.object({
    ...common,
    page_url: optional,
    destination_url: optional,
  }),
  author_clicks: z.object({
    ...common,
    author_name: z.string().max(300),
    clicked_from_page: optional,
  }),
  section_clicks: z.object({
    ...common,
    section_name: z.string().max(300),
    clicked_from_page: optional,
  }),
};
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request))
    return new NextResponse(null, { status: 403 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return new NextResponse(null, { status: 503 });
  const id = session(request);
  if (!id) return new NextResponse(null, { status: 401 });
  if (!allowRateLimit(`analytics:${getClientIp(request)}:${id}`, 300, 60_000))
    return new NextResponse(null, { status: 429 });
  try {
    if (
      !(await consumeRateLimit(`analytics:${getClientIp(request)}`, 1000, 60))
    )
      return new NextResponse(null, { status: 429 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
  const text = await request.text();
  if (text.length > 32768) return new NextResponse(null, { status: 413 });
  let input;
  try {
    input = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const event = input?.event as keyof typeof schemas;
  if (!Object.hasOwn(schemas, event))
    return new NextResponse(null, { status: 400 });
  const parsed = schemas[event].safeParse(input.data);
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  const tenant = await getTenantForApiRoute();
  const admin = createAdminClient();
  const values = parsed.data as Record<string, unknown>;
  for (const [field, table] of [
    ["article_id", "articles"],
    ["ad_id", "ads"],
  ] as const) {
    if (!values[field]) continue;
    const { data, error } = await admin
      .from(table)
      .select("id")
      .eq("id", values[field])
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (error) return new NextResponse(null, { status: 503 });
    if (!data) return new NextResponse(null, { status: 400 });
  }
  if (event === "page_view_update") {
    let query = admin
      .from("page_views")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("session_id", id);
    query = values.article_id
      ? query.eq("article_id", values.article_id)
      : query.is("article_id", null);
    const { data, error } = await query
      .order("viewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return new NextResponse(null, { status: 503 });
    if (data) {
      const update = {
        time_spent_seconds: values.time_spent_seconds,
        scroll_depth_percent: values.scroll_depth_percent,
        max_scroll_depth: values.max_scroll_depth,
        completed_article: values.completed_article,
      };
      const { error } = await admin
        .from("page_views")
        .update({ ...update, exit_page: true })
        .eq("id", data.id)
        .eq("tenant_id", tenant.id)
        .eq("session_id", id);
      if (error) return new NextResponse(null, { status: 503 });
    }
  } else {
    const {
      data: { user },
    } = await (await createClient()).auth.getUser();
    const { error } = await admin.from(event).insert({
      ...values,
      tenant_id: tenant.id,
      session_id: id,
      user_id: user?.id ?? null,
    });
    if (error) return new NextResponse(null, { status: 503 });
  }
  return new NextResponse(null, { status: 204 });
}
