/**
 * Welcome email when a user subscribes to the newsletter (profile / subscribe flow).
 * Excludes bulk newsletter *campaigns* — this is a transactional confirmation only.
 */

import {
  emailHeadlineHtml,
  FONT_BODY,
  wrapTransactionalEmailHtml,
} from "./emailLayout";
import { buildStandardEmailFooterPlain, getEmailFooterUrls } from "./emailFooter";

const P = `font-family: ${FONT_BODY};`;

export function buildNewsletterWelcomeEmailHtml(): string {
  const manageUrl = `${getEmailFooterUrls().site}/profile?tab=newsletter`;

  const inner = `
    ${emailHeadlineHtml("Welcome to the Spring-Ford Press Newsletter")}
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      <strong>You're part of a group that gets the news first.</strong> As a subscriber, you'll be among the first to know when new articles publish, with access to premium stories and exclusive neighborhood coverage.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333; ${P}">
      We'll send you our weekly briefing and timely updates—no spam, just what matters to you and your community.
    </p>
    <p style="margin: 0; font-size: 15px; color: #333333; ${P}">
      — The Spring-Ford Press team
    </p>
  `;

  return wrapTransactionalEmailHtml({
    documentTitle: "Welcome to the Spring-Ford Press Newsletter",
    innerContentHtml: inner,
    footerUnsubscribeUrl: manageUrl,
  });
}

export function buildNewsletterWelcomeEmailPlain(): string {
  const manageUrl = `${getEmailFooterUrls().site}/profile?tab=newsletter`;
  const body = `Welcome to the Spring-Ford Press Newsletter.

You're part of a group that gets the news first. As a subscriber, you'll be among the first to know when new articles publish, with access to premium stories and exclusive neighborhood coverage.

We'll send you our weekly briefing and timely updates—no spam, just what matters to you and your community.

— The Spring-Ford Press team`;

  return `${body}\n\n${buildStandardEmailFooterPlain({ unsubscribeUrl: manageUrl })}`;
}
