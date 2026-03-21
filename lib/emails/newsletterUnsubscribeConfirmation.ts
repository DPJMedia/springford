/**
 * Sent when a user unsubscribes from the newsletter (transactional).
 * Bulk newsletter *campaigns* are separate and not previewed here.
 */

import {
  emailHeadlineHtml,
  FONT_BODY,
  wrapTransactionalEmailHtml,
} from "./emailLayout";
import {
  buildStandardEmailFooterPlain,
  getEmailFooterUrls,
} from "./emailFooter";

const P = `font-family: ${FONT_BODY};`;

export function buildNewsletterUnsubscribeConfirmationHtml(): string {
  const { site } = getEmailFooterUrls();
  const subscribeUrl = `${site}/subscribe`;
  const subscribeLinkText = subscribeUrl.replace(/^https?:\/\//, "");

  const inner = `
    ${emailHeadlineHtml("We're sorry to see you go")}
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      You've been unsubscribed from the Spring-Ford Press newsletter.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333; ${P}">
      We hope to see you again soon. If you change your mind, you can always resubscribe from your profile or at <a href="${subscribeUrl}" style="color: #2b8aa8;">${subscribeLinkText}</a>.
    </p>
    <p style="margin: 0; font-size: 15px; color: #333333; ${P}">
      — The Spring-Ford Press team
    </p>
  `;

  return wrapTransactionalEmailHtml({
    documentTitle: "We're sorry to see you go",
    innerContentHtml: inner,
  });
}

export function buildNewsletterUnsubscribeConfirmationPlain(): string {
  const { site } = getEmailFooterUrls();
  const body = `We're sorry to see you go.

You've been unsubscribed from the Spring-Ford Press newsletter. If you change your mind, you can resubscribe at ${site}/subscribe.

— The Spring-Ford Press team`;

  return `${body}\n\n${buildStandardEmailFooterPlain()}`;
}
