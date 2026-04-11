/**
 * Standard footer for user-facing SendGrid emails.
 * First link: tenant publication name (branding.siteName) → canonical public site URL (branding.siteUrl),
 * then Terms | Privacy | Contact.
 */

import type { TransactionalEmailBranding } from "./emailBranding";

function escapeEmailFooterText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getEmailFooterUrls(branding: TransactionalEmailBranding): {
  /** Canonical tenant site origin (no trailing slash). */
  site: string;
  tos: string;
  privacy: string;
  contact: string;
} {
  const base = String(branding.siteUrl).replace(/\/$/, "");
  return {
    site: base,
    tos: `${base}/terms-of-service`,
    privacy: `${base}/privacy-policy`,
    contact: `${base}/contact`,
  };
}

/** HTML block placed below the main email card (same across all transactional emails). */
export function buildStandardEmailFooterHtml(
  branding: TransactionalEmailBranding,
  options?: {
    /** When set, adds "| Unsubscribe" after Contact (e.g. profile Newsletter tab). */
    unsubscribeUrl?: string | null;
  },
): string {
  const { site, tos, privacy, contact } = getEmailFooterUrls(branding);
  const siteLabel = escapeEmailFooterText(branding.siteName);
  const unsub =
    options?.unsubscribeUrl && options.unsubscribeUrl.length > 0
      ? `
  &nbsp;|&nbsp;
  <a href="${options.unsubscribeUrl}" style="color: #2b8aa8; text-decoration: underline;">Unsubscribe</a>`
      : "";
  return `<p style="margin: 24px 0 0; font-size: 13px; color: #666666; text-align: center; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
  <a href="${site}" style="color: #2b8aa8; text-decoration: underline;">${siteLabel}</a>
  &nbsp;|&nbsp;
  <a href="${tos}" style="color: #2b8aa8; text-decoration: underline;">Terms of Service</a>
  &nbsp;|&nbsp;
  <a href="${privacy}" style="color: #2b8aa8; text-decoration: underline;">Privacy Policy</a>
  &nbsp;|&nbsp;
  <a href="${contact}" style="color: #2b8aa8; text-decoration: underline;">Contact Us</a>${unsub}
</p>`;
}

/** Plain-text footer for multipart/alternative emails. */
export function buildStandardEmailFooterPlain(
  branding: TransactionalEmailBranding,
  options?: {
    unsubscribeUrl?: string | null;
  },
): string {
  const { site, tos, privacy, contact } = getEmailFooterUrls(branding);
  const lines = [
    `${branding.siteName}: ${site}`,
    `Terms of Service: ${tos}`,
    `Privacy Policy: ${privacy}`,
    `Contact Us: ${contact}`,
  ];
  if (options?.unsubscribeUrl && options.unsubscribeUrl.length > 0) {
    lines.push(`Unsubscribe: ${options.unsubscribeUrl}`);
  }
  return lines.join("\n");
}
