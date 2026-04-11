/**
 * Sent when a user unsubscribes from the newsletter (transactional).
 * Bulk newsletter *campaigns* are separate and not previewed here.
 */

import type { TransactionalEmailBranding } from "./emailBranding";
import {
  emailHeadlineHtml,
  escapeHtml,
  FONT_BODY,
  wrapTransactionalEmailHtml,
} from "./emailLayout";
import { buildStandardEmailFooterPlain, getEmailFooterUrls } from "./emailFooter";

const P = `font-family: ${FONT_BODY};`;

export function buildNewsletterUnsubscribeConfirmationHtml(
  branding: TransactionalEmailBranding,
): string {
  const { site } = getEmailFooterUrls(branding);
  const subscribeUrl = `${site}/subscribe`;
  const subscribeLinkText = subscribeUrl.replace(/^https?:\/\//, "");

  const inner = `
    ${emailHeadlineHtml("We're sorry to see you go")}
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      You've been unsubscribed from the ${escapeHtml(branding.siteName)} newsletter.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333; ${P}">
      We hope to see you again soon. If you change your mind, you can always resubscribe from your profile or at <a href="${subscribeUrl}" style="color: #2b8aa8;">${subscribeLinkText}</a>.
    </p>
    <p style="margin: 0; font-size: 15px; color: #333333; ${P}">
      — The ${escapeHtml(branding.siteName)} team
    </p>
  `;

  return wrapTransactionalEmailHtml({
    documentTitle: "We're sorry to see you go",
    innerContentHtml: inner,
    branding,
  });
}

export function buildNewsletterUnsubscribeConfirmationPlain(
  branding: TransactionalEmailBranding,
): string {
  const { site } = getEmailFooterUrls(branding);
  const body = `We're sorry to see you go.

You've been unsubscribed from the ${branding.siteName} newsletter. If you change your mind, you can resubscribe at ${site}/subscribe.

— The ${branding.siteName} team`;

  return `${body}\n\n${buildStandardEmailFooterPlain(branding)}`;
}
