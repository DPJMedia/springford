/**
 * Shared layout, fonts, and masthead for all transactional HTML emails.
 * Matches the newsletter subscription confirmation (Playfair masthead, Newsreader headlines, Red Hat body).
 */

import type { TransactionalEmailBranding } from "./emailBranding";
import { buildStandardEmailFooterHtml } from "./emailFooter";

/** Same Google Fonts bundle as the newsletter welcome email. */
export const EMAIL_FONTS_LINK =
  "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Newsreader:ital,wght@0,400;0,600;0,700&family=Red+Hat+Display:wght@400;500;600&display=swap";

export const FONT_BODY = "'Red Hat Display', 'Inter', system-ui, sans-serif";
export const FONT_HEADLINE = "'Newsreader', Georgia, serif";
export const FONT_MASTHEAD = "'Playfair Display', Didot, 'Bodoni MT', serif";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Primary headline inside the white card (Newsreader — same as newsletter h2).
 */
export function emailHeadlineHtml(text: string): string {
  return `<h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #000000; letter-spacing: -0.015em; font-family: ${FONT_HEADLINE};">${escapeHtml(text)}</h2>`;
}

/**
 * Full transactional email: masthead + gray band + white content card + standard footer.
 * `innerContentHtml` is placed inside the padded white cell (headlines, body copy only).
 */
export function wrapTransactionalEmailHtml(options: {
  documentTitle: string;
  innerContentHtml: string;
  branding: TransactionalEmailBranding;
  /** Adds Unsubscribe next to Contact Us in the footer link row (e.g. newsletter welcome). */
  footerUnsubscribeUrl?: string | null;
}): string {
  const title = escapeHtml(options.documentTitle);
  const footer = buildStandardEmailFooterHtml(
    options.branding,
    options.footerUnsubscribeUrl
      ? { unsubscribeUrl: options.footerUnsubscribeUrl }
      : undefined,
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="${EMAIL_FONTS_LINK}" rel="stylesheet">
</head>
<body style="margin:0; padding:0; font-family: ${FONT_BODY}; background-color: #e8e8e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8e8e8;">
    <tr>
      <td align="center" style="padding: 24px 20px 16px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000; letter-spacing: -0.02em; font-family: ${FONT_MASTHEAD};">${escapeHtml(options.branding.siteName)}</h1>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 20px 32px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #e0e0e0;">
          <tr>
            <td style="padding: 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border: 1px solid #d0d0d0;">
                <tr>
                  <td style="padding: 40px 48px 32px;">
                    ${options.innerContentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        ${footer}
      </td>
    </tr>
  </table>
</body>
</html>`;
}
