import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

// Canonical URLs for email — always use production domain (no Vercel/deployment URLs)
const SITE_URL = 'https://www.springford.press'
const TOS_URL = 'https://www.springford.press/terms-of-service'
const PRIVACY_URL = 'https://www.springford.press/privacy-policy'

// Site fonts: masthead=Playfair Display, headlines=Newsreader, body=Red Hat Display
const FONTS_LINK = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Newsreader:ital,wght@0,400;0,600;0,700&family=Red+Hat+Display:wght@400;500;600&display=swap'

// WSJ-style layout: logo alone at top, shaded section with white box, footer links
function buildWelcomeEmailHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the Spring-Ford Press Newsletter</title>
  <link href="${FONTS_LINK}" rel="stylesheet">
</head>
<body style="margin:0; padding:0; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif; background-color: #e8e8e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e8e8e8;">
    <tr>
      <td style="padding: 24px 20px 16px; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #666666; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
          <a href="${SITE_URL}" style="color: #333333; text-decoration: underline;">Trouble viewing this email? View in web browser</a>
        </p>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 16px 20px 32px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000; letter-spacing: -0.02em; font-family: 'Playfair Display', Didot, 'Bodoni MT', serif;">Spring-Ford Press</h1>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 0 20px 40px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 640px; background: #e0e0e0;">
          <tr>
            <td style="padding: 32px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border: 1px solid #d0d0d0;">
                <tr>
                  <td style="padding: 40px 48px 32px;">
                    <h2 style="margin: 0 0 20px; font-size: 24px; font-weight: 700; color: #000000; letter-spacing: -0.015em; font-family: 'Newsreader', Georgia, serif;">
                      Welcome to the Spring-Ford Press Newsletter
                    </h2>
                    <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.65; color: #1a1a1a; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
                      <strong>You're part of a group that gets the news first.</strong> As a subscriber, you'll be among the first to know when new articles publish, with access to premium stories and exclusive neighborhood coverage.
                    </p>
                    <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.65; color: #333333; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
                      We'll send you our weekly briefing and timely updates—no spam, just what matters to you and your community.
                    </p>
                    <p style="margin: 0; font-size: 15px; color: #333333; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
                      — The Spring-Ford Press team
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 24px 24px;">
              <p style="margin: 0; font-size: 13px; color: #333333; text-align: center; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
                <a href="${SITE_URL}" style="color: #000000; text-decoration: underline;">Spring-Ford Press</a>
                &nbsp;|&nbsp;
                <a href="${TOS_URL}" style="color: #000000; text-decoration: underline;">Terms of Service</a>
                &nbsp;|&nbsp;
                <a href="${PRIVACY_URL}" style="color: #000000; text-decoration: underline;">Privacy Policy</a>
              </p>
              <p style="margin: 12px 0 0; font-size: 12px; color: #666666; text-align: center; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
                Neighborhood-First Reporting
              </p>
              <p style="margin: 4px 0 0; font-size: 11px; color: #999999; text-align: center; font-family: 'Red Hat Display', 'Inter', system-ui, sans-serif;">
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

    const body = {
      personalizations: [{ to: [{ email: email.trim() }], subject: 'Thank you for Subscribing! — Spring-Ford Press' }],
      from: { email: fromEmail, name: fromName },
      content: [
        {
          type: 'text/plain',
          value: 'Welcome to the Spring-Ford Press Newsletter.\n\nYou\'re part of a group that gets the news first. As a subscriber, you\'ll be among the first to know when new articles publish, with access to premium stories and exclusive neighborhood coverage.\n\nWe\'ll send you our weekly briefing and timely updates—no spam, just what matters to you and your community.\n\n— The Spring-Ford Press team\n\nSpring-Ford Press: ' + SITE_URL + '\nTerms of Service: ' + TOS_URL + '\nPrivacy Policy: ' + PRIVACY_URL,
        },
        {
          type: 'text/html',
          value: buildWelcomeEmailHtml(),
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
