"use client"

import { useEffect } from 'react'

type ArticleMetadataProps = {
  title: string
  description: string
  imageUrl: string | null
  articleUrl: string
}

// Fallback logo - using SVG for now, can be replaced with PNG if needed
const FALLBACK_LOGO_URL = '/springford-press-logo.svg'

export function ArticleMetadata({ title, description, imageUrl, articleUrl }: ArticleMetadataProps) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const origin = window.location.origin
    const fullUrl = articleUrl.startsWith('http') ? articleUrl : `${origin}${articleUrl}`

    const ogImage = imageUrl || FALLBACK_LOGO_URL
    const absoluteImageUrl = ogImage.startsWith('http') 
      ? ogImage 
      : `${origin}${ogImage}`

    // Update or create meta tags
    const updateMetaTag = (property: string, content: string, isProperty = true) => {
      const attribute = isProperty ? 'property' : 'name'
      let element = document.querySelector(`meta[${attribute}="${property}"]`)
      
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, property)
        document.head.appendChild(element)
      }
      element.setAttribute('content', content)
    }

    // Update title
    document.title = `${title} | Spring-Ford Press`

    // Open Graph tags
    updateMetaTag('og:title', title)
    updateMetaTag('og:description', description || title)
    updateMetaTag('og:image', absoluteImageUrl)
    updateMetaTag('og:url', fullUrl)
    updateMetaTag('og:type', 'article')
    updateMetaTag('og:site_name', 'Spring-Ford Press')

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image', false)
    updateMetaTag('twitter:title', title, false)
    updateMetaTag('twitter:description', description || title, false)
    updateMetaTag('twitter:image', absoluteImageUrl, false)

    // Standard meta tags
    updateMetaTag('description', description || title, false)
  }, [title, description, imageUrl, articleUrl])

  return null
}

