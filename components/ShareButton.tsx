"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ShareButtonProps = {
  articleTitle: string
  articleUrl: string
  articleId: string
}

export function ShareButton({ articleTitle, articleUrl, articleId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  const trackShare = async () => {
    try {
      await supabase.rpc('increment_article_shares', { article_id: articleId })
    } catch (error) {
      console.error('Failed to track share:', error)
      // Don't block the share action if tracking fails
    }
  }

  const handleShare = async () => {
    const fullUrl = typeof window !== 'undefined' 
      ? `${window.location.origin}${articleUrl}`
      : articleUrl

    // Track the share
    await trackShare()

    // Try Web Share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: articleTitle,
          text: articleTitle,
          url: fullUrl,
        })
        return
      } catch (err) {
        // User cancelled or error occurred, fall through to copy
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = fullUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        alert('Failed to copy link. Please copy manually: ' + fullUrl)
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 text-[color:var(--color-medium)] hover:text-[color:var(--color-riviera-blue)] transition-colors duration-200 group"
      aria-label={copied ? "Link copied!" : "Share article"}
      title={copied ? "Link copied!" : "Share article"}
    >
      {copied ? (
        <>
          <svg
            className="w-4 h-4 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-xs font-medium text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4 transition-transform group-hover:scale-110"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          <span className="text-xs font-normal">Share</span>
        </>
      )}
    </button>
  )
}

