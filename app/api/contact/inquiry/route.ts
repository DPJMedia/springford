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

  const name = str(body.name, 200);
  const email = str(body.email, 320);
  const subjectLine = str(body.subject, 300);
  const message = str(body.message, 8000);

  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Name and a valid email are required." },
      { status: 400 },
    );
  }
  if (!subjectLine) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const subject = `New Contact Form Submission — ${siteName}`;

  const textBody = [
    `Publication: ${siteName}`,
    `Domain: ${domain}`,
    `Public URL: ${siteUrl}`,
    "",
    `From: ${name}`,
    `Email: ${email}`,
    `Subject: ${subjectLine}`,
    "",
    message,
  ].join("\n");

  const htmlBody = `
<p style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #111;">
  <strong>Publication:</strong> ${escapeHtml(siteName)}<br/>
  <strong>Domain:</strong> ${escapeHtml(domain)}<br/>
  <strong>Public URL:</strong> <a href="${escapeHtml(siteUrl)}">${escapeHtml(siteUrl)}</a>
</p>
<hr style="border: none; border-top: 1px solid #ddd; margin: 16px 0;" />
<p style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.5; color: #111;">
  <strong>From:</strong> ${escapeHtml(name)}<br/>
  <strong>Email:</strong> ${escapeHtml(email)}<br/>
  <strong>Subject:</strong> ${escapeHtml(subjectLine)}
</p>
<p style="font-family: system-ui, sans-serif; font-size: 14px; line-height: 1.6; color: #222; white-space: pre-wrap;">${escapeHtml(message)}</p>`;

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
