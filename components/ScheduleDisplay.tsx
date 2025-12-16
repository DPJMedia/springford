"use client";

import { useState, useEffect } from "react";

interface ScheduleDisplayProps {
  scheduledFor: string;
  status: string;
  onPublishTime?: () => void; // Callback when publishing time arrives
}

export function ScheduleDisplay({ scheduledFor, status, onPublishTime }: ScheduleDisplayProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [publishTriggered, setPublishTriggered] = useState(false);

  useEffect(() => {
    if (status !== "scheduled" || !scheduledFor) return;

    const updateCountdown = () => {
      const now = new Date();
      const scheduled = new Date(scheduledFor);
      const diff = scheduled.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Publishing now...");
        
        // Trigger publish callback once
        if (!publishTriggered && onPublishTime) {
          setPublishTriggered(true);
          onPublishTime();
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [scheduledFor, status]);

  if (status !== "scheduled" || !scheduledFor) {
    return null;
  }

  const formatScheduledTime = () => {
    try {
      const date = new Date(scheduledFor);
      return date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }) + " ET";
    } catch {
      return scheduledFor;
    }
  };

  const isPublishingNow = timeLeft === "Publishing now...";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs">
        {isPublishingNow ? (
          <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )}
        <span className={`font-semibold ${isPublishingNow ? 'text-blue-900' : 'text-orange-900'}`}>
          {isPublishingNow ? 'Publishing...' : `Scheduled: ${formatScheduledTime()}`}
        </span>
      </div>
      {!isPublishingNow && (
        <div className="flex items-center gap-2 text-xs pl-6">
          <span className="text-orange-700">
            ⏳ Time until publish: <strong className="text-orange-900">{timeLeft}</strong>
          </span>
        </div>
      )}
      {isPublishingNow && (
        <div className="flex items-center gap-2 text-xs pl-6">
          <span className="text-blue-700 animate-pulse">
            ✓ Publishing article now... Page will refresh automatically.
          </span>
        </div>
      )}
    </div>
  );
}

