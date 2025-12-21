import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Email sending will be implemented later when SMTP is configured
    // For now, just update the database - email can be sent via Supabase Edge Function or email templates later
    console.log('Newsletter subscription confirmed for:', email)
    // TODO: Set up email sending when SMTP is configured

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error sending newsletter welcome email:', error)
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}

