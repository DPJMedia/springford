import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  buildNewsletterWelcomeEmailHtml,
  buildNewsletterWelcomeEmailPlain,
} from '@/lib/emails/newsletterWelcome'

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send'

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
          value: buildNewsletterWelcomeEmailPlain(),
        },
        {
          type: 'text/html',
          value: buildNewsletterWelcomeEmailHtml(),
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
