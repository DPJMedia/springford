import { useEffect, useRef } from 'react';
import {
  trackPageView,
  updatePageView,
  getSessionId,
  calculateScrollDepth,
} from './tracker';

interface UsePageTrackingOptions {
  viewType: 'article' | 'homepage' | 'section' | 'author' | 'tag' | 'other';
  articleId?: string;
  userId?: string;
  trackScroll?: boolean;
}

export function usePageTracking(options: UsePageTrackingOptions) {
  const entryTimeRef = useRef<number>(Date.now());
  const maxScrollRef = useRef<number>(0);
  const hasTrackedView = useRef<boolean>(false);

  useEffect(() => {
    // Track page view on mount
    if (!hasTrackedView.current) {
      trackPageView({
        viewType: options.viewType,
        articleId: options.articleId,
        userId: options.userId,
      });
      hasTrackedView.current = true;
    }

    // Track scroll if enabled
    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      if (options.trackScroll) {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const currentScroll = calculateScrollDepth();
          if (currentScroll > maxScrollRef.current) {
            maxScrollRef.current = currentScroll;
          }
        }, 100);
      }
    };

    if (options.trackScroll) {
      window.addEventListener('scroll', handleScroll);
    }

    // Track page exit on unmount
    return () => {
      if (options.trackScroll) {
        window.removeEventListener('scroll', handleScroll);
      }

      const timeSpent = Math.round((Date.now() - entryTimeRef.current) / 1000);
      const scrollDepth = maxScrollRef.current;

      // Update the page view record with time and scroll data
      updatePageView({
        sessionId: getSessionId(),
        articleId: options.articleId,
        timeSpentSeconds: timeSpent,
        scrollDepthPercent: scrollDepth,
        maxScrollDepth: Math.round((document.documentElement.scrollHeight * scrollDepth) / 100),
        completedArticle: scrollDepth >= 90,
      });
    };
  }, [options.viewType, options.articleId, options.userId, options.trackScroll]);

  return {
    sessionId: getSessionId(),
    getCurrentScrollDepth: () => maxScrollRef.current,
    getTimeSpent: () => Math.round((Date.now() - entryTimeRef.current) / 1000),
  };
}
