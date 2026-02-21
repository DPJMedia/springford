import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

// Site colors: riviera-blue #2b8aa8, dark #1a1a1a, medium #666666
function buildWelcomeEmailHtml(siteBaseUrl: string): string {
  const logoUrl = siteBaseUrl
    ? `${siteBaseUrl.replace(/\/$/, '')}/springford-press-logo.svg`
    : ''
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for subscribing</title>
</head>
<body style="margin:0; padding:0; font-family: Georgia, 'Times New Roman', serif; background-color: #fafafa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fafafa; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px; background: #ffffff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); border: 1px solid rgba(0,0,0,0.08); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #2b8aa8 0%, #57959f 100%); padding: 40px 32px; text-align: center;">
              ${logoUrl ? `<img src="${logoUrl}" alt="Spring-Ford Press" width="180" height="95" style="display: inline-block; max-width: 180px; height: auto;" />` : ''}
              ${!logoUrl ? '<span style="font-size: 28px; font-weight: bold; color: #ffffff; letter-spacing: -0.02em;">Spring-Ford Press</span>' : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.02em;">
                Thank you for subscribing!
              </h1>
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #1a1a1a;">
                You're all set. We'll keep you updated with the latest neighborhood stories, local news, council agendas, and upcoming meetings.
              </p>
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #666666;">
                Look for our weekly briefing in your inbox. No spam—just what matters to you and your community.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
                <tr>
                  <td>
                    <div style="width: 60px; height: 4px; background-color: #2b8aa8; border-radius: 2px;"></div>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 14px; color: #666666;">
                — The Spring-Ford Press team
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid rgba(0,0,0,0.08); text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
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
          value: 'Thank you for subscribing to the Spring-Ford Press newsletter.\n\nWe\'ll keep you updated with neighborhood stories, local news, council agendas, and upcoming meetings. Look for our weekly briefing in your inbox. No spam—just what matters to you and your community.\n\n— The Spring-Ford Press team',
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
