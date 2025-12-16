"use client";

import { useEffect } from "react";

/**
 * Background component that automatically publishes scheduled articles
 * Runs every 30 seconds when user is on admin pages
 */
export function ScheduledPublisher() {
  useEffect(() => {
    const publishScheduled = async () => {
      try {
        const response = await fetch("/api/publish-scheduled");
        const data = await response.json();
        
        if (data.published_count > 0) {
          console.log(`✅ Auto-published ${data.published_count} article(s)`);
          // Reload the page to show updated articles
          window.location.reload();
        }
      } catch (error) {
        console.error("Error checking scheduled articles:", error);
      }
    };

    // Run immediately on mount
    publishScheduled();

    // Then run every 30 seconds
    const interval = setInterval(publishScheduled, 30000);

    return () => clearInterval(interval);
  }, []);

  return null; // This component doesn't render anything
}

