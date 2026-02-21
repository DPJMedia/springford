import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

// White-and-black aesthetic; no logo image (email clients often block SVGs)
function buildWelcomeEmailHtml(siteBaseUrl: string): string {
  const siteHost = siteBaseUrl ? siteBaseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'springford.press'
  const siteLink = siteBaseUrl ? siteBaseUrl.replace(/\/$/, '') : 'https://springford.press'
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for subscribing</title>
</head>
<body style="margin:0; padding:0; font-family: Georgia, 'Times New Roman', serif; background-color: #ffffff;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
    <tr>
      <td align="center" style="padding: 48px 24px 56px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #ffffff; border: 1px solid #e5e5e5; border-radius: 2px;">
          <tr>
            <td style="padding: 48px 56px 32px; border-bottom: 1px solid #e5e5e5;">
              <p style="margin: 0 0 8px; font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #666666;">Newsletter</p>
              <h1 style="margin: 0 0 4px; font-size: 32px; font-weight: 700; color: #000000; letter-spacing: -0.02em;">Spring-Ford Press</h1>
              <p style="margin: 0; font-size: 14px; color: #666666;"><a href="${siteLink}" style="color: #000000; text-decoration: none;">${siteHost}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 56px 48px;">
              <h2 style="margin: 0 0 24px; font-size: 26px; font-weight: 700; color: #000000; letter-spacing: -0.02em;">
                Thank you for subscribing!
              </h2>
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.65; color: #1a1a1a;">
                You're all set. We'll keep you updated with the latest neighborhood stories, local news, council agendas, and upcoming meetings.
              </p>
              <p style="margin: 0 0 32px; font-size: 17px; line-height: 1.65; color: #333333;">
                Look for our weekly briefing in your inbox. No spam—just what matters to you and your community.
              </p>
              <p style="margin: 0; font-size: 16px; color: #333333;">
                — The Spring-Ford Press team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 56px 32px; border-top: 1px solid #e5e5e5; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #333333;">
                <a href="${siteLink}" style="color: #000000; text-decoration: underline;">${siteHost}</a>
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #666666;">
                Neighborhood-First Reporting
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #999999;">
                © Spring-Ford Press. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.SENDGRID_API_KEY
    const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.NEXT_PUBLIC_NEWSLETTER_FROM_EMAIL || 'admin@dpjmedia.com'
    const fromName = process.env.SENDGRID_FROM_NAME || 'Spring-Ford Press'

    if (!apiKey) {
      console.warn('SENDGRID_API_KEY not set; skipping welcome email')
      return NextResponse.json({ success: true })
    }

    const siteBaseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
      'https://springford.press'

    const body = {
      personalizations: [{ to: [{ email: email.trim() }], subject: 'Thank you for Subscribing! — Spring-Ford Press' }],
      from: { email: fromEmail, name: fromName },
      content: [
        {
          type: 'text/plain',
          value: 'Thank you for subscribing to the Spring-Ford Press newsletter.\n\nWe\'ll keep you updated with neighborhood stories, local news, council agendas, and upcoming meetings. Look for our weekly briefing in your inbox. No spam—just what matters to you and your community.\n\n— The Spring-Ford Press team\n\nspringford.press',
        },
        {
          type: 'text/html',
          value: buildWelcomeEmailHtml(siteBaseUrl),
        },
      ],
    }

    const res = await fetch(SENDGRID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('SendGrid error:', res.status, errText)
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending newsletter welcome email:', error)
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}
