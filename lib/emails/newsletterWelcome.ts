/**
 * Welcome email when a user subscribes to the newsletter (profile / subscribe flow).
 * Excludes bulk newsletter *campaigns* — this is a transactional confirmation only.
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

export function buildNewsletterWelcomeEmailHtml(
  branding: TransactionalEmailBranding,
): string {
  const { site } = getEmailFooterUrls(branding);
  const manageUrl = `${site}/profile?tab=newsletter`;
  const title = `Welcome to the ${branding.siteName} Newsletter`;

  const inner = `
    ${emailHeadlineHtml(title)}
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      <strong>You're part of a group that gets the news first.</strong> As a subscriber, you'll be among the first to know when new articles publish, with access to premium stories and exclusive neighborhood coverage.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333; ${P}">
      We'll send you our weekly briefing and timely updates—no spam, just what matters to you and your community.
    </p>
    <p style="margin: 0; font-size: 15px; color: #333333; ${P}">
      — The ${escapeHtml(branding.siteName)} team
    </p>
  `;

  return wrapTransactionalEmailHtml({
    documentTitle: title,
    innerContentHtml: inner,
    branding,
    footerUnsubscribeUrl: manageUrl,
  });
}

export function buildNewsletterWelcomeEmailPlain(
  branding: TransactionalEmailBranding,
): string {
  const { site } = getEmailFooterUrls(branding);
  const manageUrl = `${site}/profile?tab=newsletter`;
  const title = `Welcome to the ${branding.siteName} Newsletter`;
  const body = `${title}.

You're part of a group that gets the news first. As a subscriber, you'll be among the first to know when new articles publish, with access to premium stories and exclusive neighborhood coverage.

We'll send you our weekly briefing and timely updates—no spam, just what matters to you and your community.

— The ${branding.siteName} team`;

  return `${body}\n\n${buildStandardEmailFooterPlain(branding, { unsubscribeUrl: manageUrl })}`;
}
