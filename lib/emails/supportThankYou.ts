import {
  emailHeadlineHtml,
  FONT_BODY,
  wrapTransactionalEmailHtml,
} from "./emailLayout";

/** Stripe checkout thank-you emails (one-time + recurring support). Webhook + Email Manager. */

const P = `font-family: ${FONT_BODY};`;

export function buildThankYouEmailHtml(
  amountDollars: string,
  receiptUrl: string | null,
  opts: {
    isRecurring: boolean;
    intervalLabel?: string;
    cancelAtLabel?: string | null;
    cancelViaEmailUrl?: string | null;
  }
): string {
  const recurringNote = opts.isRecurring
    ? `
    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      <strong>This is a recurring contribution.</strong> Your receipt from Stripe reflects recurring billing${opts.intervalLabel ? ` (${opts.intervalLabel})` : ""}.
      ${opts.cancelAtLabel ? `Your current commitment ends around <strong>${opts.cancelAtLabel}</strong> unless you change or cancel it from your profile.` : "You can manage or cancel anytime from your Spring-Ford Press profile."}
    </p>`
    : "";

  const receiptSection = receiptUrl
    ? `
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      <strong>Your payment receipt</strong> is available to view or print at any time:
    </p>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      <a href="${receiptUrl}" style="color: #2b8aa8; font-weight: 600; text-decoration: underline;">View your receipt →</a>
    </p>`
    : `
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #1a1a1a; ${P}">
      A receipt for your payment has been sent by our payment processor.
    </p>`;

  const cancelBlock = opts.cancelViaEmailUrl
    ? `
              <p style="margin: 28px 0 0; padding-top: 20px; border-top: 1px solid #e8e8e8; font-size: 11px; line-height: 1.55; color: #888888; ${P}">
                Need to cancel this recurring contribution? <a href="${opts.cancelViaEmailUrl}" style="color: #888888; text-decoration: underline;">Cancel from this email</a> (link valid 90 days). You can also cancel anytime from your Spring-Ford Press profile under Support.
              </p>`
    : "";

  const inner = `
    ${emailHeadlineHtml("Thank you for your contribution")}
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333; ${P}">
      Your support helps us keep independent, neighborhood-first reporting in the Spring-Ford area.
    </p>
    <p style="margin: 0 0 8px; font-size: 15px; color: #666666; ${P}">Amount${opts.isRecurring ? " (first billing period)" : ""}:</p>
    <p style="margin: 0 0 24px; font-size: 28px; font-weight: 700; color: #1a1a1a; ${P}">${amountDollars}</p>
    ${recurringNote}
    ${receiptSection}
    <p style="margin: 0; font-size: 15px; color: #333333; ${P}">
      — The Spring-Ford Press team
    </p>
    ${cancelBlock}
  `;

  return wrapTransactionalEmailHtml({
    documentTitle: "Thank you for your support",
    innerContentHtml: inner,
  });
}
