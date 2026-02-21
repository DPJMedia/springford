"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function NewsletterForm() {
  const [user, setUser] = useState<any>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    checkUserStatus()
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkUserStatus()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function checkUserStatus() {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    
    if (currentUser) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('newsletter_subscribed')
        .eq('id', currentUser.id)
        .single()
      
      setIsSubscribed(profile?.newsletter_subscribed || false)
      setUser(currentUser)
    } else {
      setUser(null)
      setIsSubscribed(false)
    }
    
    setLoading(false)
  }

  // Don't show anything while loading
  if (loading) {
    return null
  }

  // Don't show if user is already subscribed
  if (isSubscribed) {
    return null
  }

  // Show signup prompt if user is not logged in
  if (!user) {
    return (
      <div className="relative overflow-hidden rounded-lg bg-[color:var(--color-riviera-blue)] p-3 shadow-soft ring-1 ring-[color:var(--color-border)] md:p-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-blue-500/20 opacity-50" />
        <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
          <div className="max-w-xl">
            <p className="eyebrow text-xs !text-white">Join Our Community</p>
            <h3 className="headline mt-0.5 text-lg font-semibold text-white">
              Sign up today for exclusive access
            </h3>
            <p className="mt-0.5 text-xs text-white/90 leading-relaxed">
              Create a free account to get personalized news, save articles, and subscribe to our premium newsletter with exclusive neighborhood insights.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-[color:var(--color-riviera-blue)] transition hover:bg-gray-50 shadow-sm whitespace-nowrap"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show newsletter form for logged-in users who haven't subscribed — Subscribe button goes to /subscribe
  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-3 shadow-soft ring-1 ring-[color:var(--color-border)] md:p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-50" />
      <div className="relative flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-6">
        <div className="max-w-xl flex-1">
          <p className="eyebrow text-xs text-[color:var(--color-medium)]">Newsletter</p>
          <h3 className="headline mt-0.5 text-lg font-semibold text-[color:var(--color-dark)]">
            Stay ahead with the Spring-Ford briefing
          </h3>
          <p className="mt-0.5 text-xs text-[color:var(--color-medium)] leading-relaxed">
            Weekly highlights on neighborhood stories, council agendas, and upcoming
            meetings. No spam. Ever.
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link
            href="/subscribe"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[color:var(--color-riviera-blue)] px-6 text-sm font-semibold text-white transition hover:bg-opacity-90 whitespace-nowrap shadow-sm"
          >
            Subscribe
          </Link>
        </div>
      </div>
    </div>
  )
}
