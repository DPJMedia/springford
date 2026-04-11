import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { buildEmailHtml, newsletterBrandingFromTenant } from '@/lib/newsletter/buildEmailHtml';
import type { NewsletterBlock, ArticleLayout } from '@/lib/newsletter/buildEmailHtml';
import { enrichArticleBlocksWithAdvertisementFlags } from '@/lib/newsletter/enrichArticleBlocksForEmail';
import {
  sendGridNewsletterGlobalCategory,
  sendGridCategoryForCampaign,
} from '@/lib/newsletter/sendGridCampaign';
import { getTenantById, getTenantBySlug } from '@/lib/tenant/getTenant';
import { getSiteConfig } from '@/lib/seo/site';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

// Test recipient used only when the "Send Test" button is clicked (testOnly: true)
const TEST_RECIPIENT = 'dylancobb2525@gmail.com';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('is_admin, is_super_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { campaignId, testOnly = false } = await request.json();

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let tenant =
      campaign.tenant_id != null ? await getTenantById(campaign.tenant_id as string) : null;
    if (!tenant) {
      tenant = await getTenantBySlug('spring-ford');
    }
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found for campaign' }, { status: 500 });
    }

    const { siteUrl, siteName } = getSiteConfig(tenant);
    const emailBranding = newsletterBrandingFromTenant(tenant);

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail =
      tenant.from_email ||
      process.env.SENDGRID_FROM_EMAIL ||
      process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL ||
      'admin@dpjmedia.com';
    const fromName =
      tenant.from_name || process.env.SENDGRID_FROM_NAME || siteName;

    if (!apiKey) {
      return NextResponse.json({ error: 'SendGrid API key not configured' }, { status: 500 });
    }

    // Use blocks from campaign (which are a snapshot of the template at send time)
    let blocks: NewsletterBlock[] = Array.isArray(campaign.blocks) ? campaign.blocks : [];
    blocks = await enrichArticleBlocksWithAdvertisementFlags(supabase, blocks, tenant.id);
    const subject = campaign.subject || `${siteName} Newsletter`;
    const previewText = campaign.preview_text || '';

    // Article layout lives in the template settings, not the campaign
    let articleLayout: ArticleLayout = 'stack';
    if (campaign.template_id) {
      const { data: template } = await supabase
        .from('newsletter_templates')
        .select('settings')
        .eq('id', campaign.template_id)
        .single();
      if (template?.settings) {
        const tmplSettings = template.settings as Record<string, unknown>;
        if (tmplSettings.articleLayout) {
          articleLayout = tmplSettings.articleLayout as ArticleLayout;
        }
      }
    }

    // Build the email HTML
    const unsubscribeUrl = `${siteUrl}/profile?tab=newsletter`;
    const html = buildEmailHtml(
      blocks,
      subject,
      emailBranding,
      previewText,
      unsubscribeUrl,
      articleLayout,
    );

    // Build plain-text fallback
    const plainBody = blocks
      .map((b: NewsletterBlock) => {
        if (b.type === 'hero_text') return [b.headline, b.subheadline, b.introText].filter(Boolean).join('\n\n');
        if (b.type === 'article') return `${b.articleTitle}\n${b.articleExcerpt || ''}\n${siteUrl}/article/${b.articleSlug}`;
        if (b.type === 'text') return [b.textTitle, b.textBody].filter(Boolean).join('\n\n');
        if (b.type === 'button') return `${b.buttonText}: ${b.buttonLink}`;
        return '';
      })
      .filter(Boolean)
      .join('\n\n---\n\n');

    const plainText = `${plainBody || subject}\n\n---\nUnsubscribe: ${unsubscribeUrl}`;

    // Determine recipients
    let recipients: Array<{ email: string; name?: string }> = [];
    let recipientCount = 0;
    const recipientsType: string = campaign.recipients_type || 'newsletter';

    if (testOnly) {
      // "Send Test" button — always goes to the test address only, never marks as sent
      recipients = [{ email: TEST_RECIPIENT }];
      recipientCount = 1;
    } else {
      // Real send — fetch based on recipients_type
      if (recipientsType === 'newsletter') {
        const { data: subs } = await supabase
          .from('tenant_newsletter_subscriptions')
          .select('user_id')
          .eq('tenant_id', tenant.id)
          .eq('subscribed', true);

        const userIds = (subs || []).map((s) => s.user_id).filter(Boolean);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('email, full_name')
            .in('id', userIds)
            .not('email', 'is', null);

          if (profiles && profiles.length > 0) {
            recipients = profiles
              .filter((s) => s.email)
              .map((s) => ({ email: s.email as string, name: s.full_name || undefined }));
            recipientCount = recipients.length;
          }
        }
      } else {
        let query = supabase.from('user_profiles').select('email, full_name').not('email', 'is', null);
        if (recipientsType === 'super_admins') {
          query = query.eq('is_super_admin', true);
        }
        // 'all_users' sends to every registered user with an email (no extra filter)
        const { data: subscribers } = await query;

        if (subscribers && subscribers.length > 0) {
          recipients = subscribers
            .filter((s) => s.email)
            .map((s) => ({ email: s.email as string, name: s.full_name || undefined }));
          recipientCount = recipients.length;
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    // Send via SendGrid — one personalization per recipient so each gets a separate message
    // and cannot see other recipients (a single `to: [ ...many ]` exposes everyone in the headers).
    // Up to 1000 personalizations per API request per SendGrid limits.
    const categoryTag = sendGridCategoryForCampaign(campaignId);
    const globalCategory = sendGridNewsletterGlobalCategory(tenant);
    const BATCH_SIZE = 1000;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const body = {
        personalizations: batch.map((r) => ({
          to: [{ email: r.email, ...(r.name ? { name: r.name } : {}) }],
          custom_args: { campaign_id: campaignId },
        })),
        from: { email: fromEmail, name: fromName },
        subject,
        categories: [globalCategory, categoryTag],
        content: [
          { type: 'text/plain', value: plainText || subject },
          { type: 'text/html', value: html },
        ],
      };

      const res = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('SendGrid error:', res.status, errText);
        return NextResponse.json({ error: 'Failed to send email via SendGrid', details: errText }, { status: 500 });
      }
    }

    // Mark campaign as sent only for real sends (not test-only)
    if (!testOnly) {
      await supabase
        .from('newsletter_campaigns')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          recipient_count: recipientCount,
        })
        .eq('id', campaignId);
    }

    const recipientLabel =
      recipientsType === 'all_users' ? 'users' :
      recipientsType === 'super_admins' ? 'super admins' :
      'subscribers';

    return NextResponse.json({
      success: true,
      recipientCount,
      testMode: testOnly,
      sentTo: testOnly ? TEST_RECIPIENT : `${recipientCount} ${recipientLabel}`,
    });
  } catch (error: unknown) {
    console.error('Send campaign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
