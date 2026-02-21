import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const newsletterParam = searchParams.get('newsletter')

  if (code) {
    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Handle server component limitation
            }
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session && data.user) {
      // Handle newsletter subscription preference
      const newsletterSubscribed = newsletterParam === 'true' || 
        (data.user.user_metadata?.newsletter_subscribed === true)
      
      if (newsletterSubscribed) {
        // Update user profile with newsletter preference
        await supabase
          .from('user_profiles')
          .update({ newsletter_subscribed: true })
          .eq('id', data.user.id)
      }
      
      // Redirect to requested page (e.g. /reset-password) or default confirm
      const nextPath = searchParams.get('next') || '/auth/confirm'
      const redirectUrl = nextPath.startsWith('/') ? `${origin}${nextPath}` : `${origin}/auth/confirm`
      const response = NextResponse.redirect(redirectUrl)
      
      // Set session cookies explicitly
      const sessionCookies = [
        {
          name: 'sb-access-token',
          value: data.session.access_token,
          options: {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          }
        },
        {
          name: 'sb-refresh-token', 
          value: data.session.refresh_token,
          options: {
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 days
          }
        }
      ]
      
      sessionCookies.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })
      
      return response
    } else {
      console.error('Auth exchange error:', error)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+expired`)
}

