import { NextResponse } from "next/server";
import { verifyNewsletterUnsubscribeToken } from "@/lib/newsletter/unsubscribeToken";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantForApiRoute } from "@/lib/tenant/getTenantForApiRoute";
export const dynamic = "force-dynamic";
function page(token: string, done = false) {
  return new Response(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Newsletter preferences</title><body style="font:16px system-ui;max-width:40rem;margin:4rem auto;padding:1rem"><h1>${done ? "You’re unsubscribed" : "Unsubscribe from this newsletter?"}</h1>${done ? "<p>Your preference has been saved. You can subscribe again from your profile.</p>" : `<p>This applies to this publication’s newsletter.</p><form method="post"><input type="hidden" name="token" value="${encodeURIComponent(token)}"><button type="submit">Unsubscribe</button></form>`}<p><a href="/">Return to the news</a></p></body></html>`,
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const data = verifyNewsletterUnsubscribeToken(token);
  const tenant = await getTenantForApiRoute();
  if (!data || data.tenantId !== tenant.id)
    return new Response("This unsubscribe link is invalid.", { status: 400 });
  return page(token);
}
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("token") || "";
  if (!token) {
    const body = await request.formData();
    token = decodeURIComponent(String(body.get("token") || ""));
  }
  const data = verifyNewsletterUnsubscribeToken(token);
  const tenant = await getTenantForApiRoute();
  if (!data || data.tenantId !== tenant.id)
    return NextResponse.json(
      { error: "Invalid unsubscribe link" },
      { status: 400 },
    );
  const db = createAdminClient();
  const { error } = await db.rpc("set_newsletter_subscription_for_user", {
    p_user: data.userId,
    p_tenant: data.tenantId,
    p_subscribed: false,
  });
  if (error)
    return NextResponse.json(
      { error: "Could not save preference. Please try again." },
      { status: 503 },
    );
  return page(token, true);
}
