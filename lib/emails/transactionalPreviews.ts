import {
  fallbackTransactionalEmailBranding,
  type TransactionalEmailBranding,
} from "./emailBranding";
import { buildNewsletterUnsubscribeConfirmationHtml } from "./newsletterUnsubscribeConfirmation";
import { buildNewsletterWelcomeEmailHtml } from "./newsletterWelcome";
import { buildSupportCancelConfirmationHtml } from "./supportCancelConfirmation";
import { buildThankYouEmailHtml } from "./supportThankYou";

export type TransactionalEmailPreview = {
  id: string;
  title: string;
  description: string;
  subject: string;
  /** Same HTML as production SendGrid payload */
  getHtml: () => string;
};

const SAMPLE_RECEIPT = "https://invoice.stripe.com/i/sample-receipt-link";

/**
 * Every user-action email sent via SendGrid from this app (excluding bulk newsletter *campaigns*).
 * Includes subscribe/unsubscribe *confirmations* (transactional); not editorial campaign blasts.
 */
export function getTransactionalEmailPreviews(
  brandingArg?: TransactionalEmailBranding,
): TransactionalEmailPreview[] {
  const branding = brandingArg ?? fallbackTransactionalEmailBranding();
  const baseUrl = branding.siteUrl.replace(/\/$/, "");

  const cancelSample = `${baseUrl}/api/support/cancel-from-email?token=sample_token_preview_only`;

  return [
    {
      id: "newsletter-subscribe-welcome",
      title: "Newsletter — subscription confirmation",
      description:
        "Sent when a logged-in user subscribes to the newsletter from the site (welcome / confirmation). Not a bulk campaign email.",
      subject: `Thank you for Subscribing! — ${branding.siteName}`,
      getHtml: () => buildNewsletterWelcomeEmailHtml(branding),
    },
    {
      id: "newsletter-unsubscribe-confirmation",
      title: "Newsletter — unsubscribe confirmation",
      description:
        "Sent when a user unsubscribes from the newsletter (transactional departure notice).",
      subject: `We're sorry to see you go — ${branding.siteName}`,
      getHtml: () => buildNewsletterUnsubscribeConfirmationHtml(branding),
    },
    {
      id: "support-thank-you-one-time",
      title: "Support — one-time donation",
      description:
        "Sent after a successful one-time Stripe Checkout payment (mode: payment). Includes receipt link when available.",
      subject: `Thank you for supporting ${branding.siteName}`,
      getHtml: () =>
        buildThankYouEmailHtml("$50.00", SAMPLE_RECEIPT, branding, { isRecurring: false }),
    },
    {
      id: "support-thank-you-one-time-no-receipt",
      title: "Support — one-time (no receipt URL)",
      description:
        "Fallback copy when Stripe does not return a hosted receipt URL yet.",
      subject: `Thank you for supporting ${branding.siteName}`,
      getHtml: () => buildThankYouEmailHtml("$50.00", null, branding, { isRecurring: false }),
    },
    {
      id: "support-thank-you-recurring",
      title: "Support — recurring (monthly, full)",
      description:
        "After subscription checkout: recurring note, Stripe invoice link, optional commitment end date, and “cancel from email” link when configured.",
      subject: `Thank you — your recurring support is set up — ${branding.siteName}`,
      getHtml: () =>
        buildThankYouEmailHtml("$10.00", SAMPLE_RECEIPT, branding, {
          isRecurring: true,
          intervalLabel: "monthly",
          cancelAtLabel: "March 3, 2027",
          cancelViaEmailUrl: cancelSample,
        }),
    },
    {
      id: "support-thank-you-recurring-no-cancel-link",
      title: "Support — recurring (no email cancel link)",
      description:
        "Same as recurring thank-you when the signed cancel token could not be built (e.g. missing webhook/cancel secret).",
      subject: `Thank you — your recurring support is set up — ${branding.siteName}`,
      getHtml: () =>
        buildThankYouEmailHtml("$10.00", SAMPLE_RECEIPT, branding, {
          isRecurring: true,
          intervalLabel: "monthly",
          cancelAtLabel: null,
          cancelViaEmailUrl: null,
        }),
    },
    {
      id: "support-thank-you-recurring-annual",
      title: "Support — recurring (annual)",
      description: "Annual billing interval label in the body copy.",
      subject: `Thank you — your recurring support is set up — ${branding.siteName}`,
      getHtml: () =>
        buildThankYouEmailHtml("$120.00", SAMPLE_RECEIPT, branding, {
          isRecurring: true,
          intervalLabel: "annual",
          cancelAtLabel: null,
          cancelViaEmailUrl: cancelSample,
        }),
    },
    {
      id: "support-cancel-confirmation",
      title: "Support — recurring canceled",
      description:
        "Sent after the user cancels recurring support (profile or one-click email link).",
      subject: `Your ${branding.siteName} support has been canceled`,
      getHtml: () => buildSupportCancelConfirmationHtml(branding),
    },
  ];
}
