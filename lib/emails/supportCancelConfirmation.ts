/**
 * HTML for recurring support cancellation confirmation.
 * Used by sendSupportCancelConfirmationEmail and admin Email Manager preview.
 */

import {
  emailHeadlineHtml,
  FONT_BODY,
  wrapTransactionalEmailHtml,
} from "./emailLayout";
import { buildStandardEmailFooterPlain } from "./emailFooter";

const P = `font-family: ${FONT_BODY};`;

export function buildSupportCancelConfirmationHtml(): string {
  const inner = `
    ${emailHeadlineHtml("Recurring support canceled")}
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      Your recurring contribution to Spring-Ford Press has been canceled. You will not be charged again for this subscription.
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333; ${P}">
      Thank you for supporting local news — we hope to see you again.
    </p>
    <p style="margin: 0; font-size: 15px; color: #333333; ${P}">
      — The Spring-Ford Press team
    </p>
  `;

  return wrapTransactionalEmailHtml({
    documentTitle: "Recurring support canceled",
    innerContentHtml: inner,
  });
}

export function buildSupportCancelConfirmationPlain(): string {
  const body = `Your recurring contribution to Spring-Ford Press has been canceled. You will not be charged again for this subscription.

Thank you for supporting local news.

— The Spring-Ford Press team`;

  return `${body}\n\n${buildStandardEmailFooterPlain()}`;
}
