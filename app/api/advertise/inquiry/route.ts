import { NextRequest, NextResponse } from "next/server";
import { escapeHtml } from "@/lib/emails/emailLayout";
import { sendTeamInboxEmail } from "@/lib/emails/sendTeamInboxEmail";
import { getSiteConfig } from "@/lib/seo/site";
import { getTenantById } from "@/lib/tenant/getTenant";
import { getTenantFromHeaders } from "@/lib/tenant/getTenantFromHeaders";

function str(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

export async function POST(request: NextRequest) {
  let tenantId: string;
  try {
    tenantId = getTenantFromHeaders(request.headers).tenantId;
  } catch {
    return NextResponse.json({ error: "Tenant context required" }, { status: 400 });
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { siteUrl, siteName } = getSiteConfig(tenant);
  const domain = tenant.domain.trim().toLowerCase();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = str(body.firstName, 120);
  const lastName = str(body.lastName, 120);
  const email = str(body.email, 320);
  const phone = str(body.phone, 80);
  const company = str(body.company, 200);
  const website = str(body.website, 500);
  const postalCode = str(body.postalCode, 32);
  const interest = str(body.interest, 2000);
  const message = str(body.message, 8000);

  if (!firstName || !lastName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "First name, last name, and a valid email are required." },
      { status: 400 },
    );
  }

  const subject = `New Advertiser Inquiry — ${siteName}`;

  const textBody = [
    `Publication: ${siteName}`,
    `Domain: ${domain}`,
    `Public URL: ${siteUrl}`,
    "",
    `Name: ${firstName} ${lastName}`,
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : null,
    company ? `Company: ${company}` : null,
    website ? `Website: ${website}` : null,
    postalCode ? `Postal code: ${postalCode}` : null,
    interest ? `Interest: ${interest}` : null,
    message ? `Message:\n${message}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const htmlBody = `
<p style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #111;">
  <strong>Publication:</strong> ${escapeHtml(siteName)}<br/>
  <strong>Domain:</strong> ${escapeHtml(domain)}<br/>
  <strong>Public URL:</strong> <a href="${escapeHtml(siteUrl)}">${escapeHtml(siteUrl)}</a>
</p>
<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
<p style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #111;">
  <strong>Name:</strong> ${escapeHtml(`${firstName} ${lastName}`)}<br/>
  <strong>Email:</strong> ${escapeHtml(email)}<br/>
  ${phone ? `<strong>Phone:</strong> ${escapeHtml(phone)}<br/>` : ""}
  ${company ? `<strong>Company:</strong> ${escapeHtml(company)}<br/>` : ""}
  ${website ? `<strong>Website:</strong> ${escapeHtml(website)}<br/>` : ""}
  ${postalCode ? `<strong>Postal code:</strong> ${escapeHtml(postalCode)}<br/>` : ""}
  ${interest ? `<strong>Interest:</strong> ${escapeHtml(interest)}<br/>` : ""}
  ${message ? `<strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}` : ""}
</p>`;

  const result = await sendTeamInboxEmail({
    subject,
    textBody,
    htmlBody,
    replyTo: email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not send notification" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
