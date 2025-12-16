"use client";

import { useState, useEffect } from "react";

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function DateTimePicker({ value, onChange, label }: DateTimePickerProps) {
  const [localDateTime, setLocalDateTime] = useState(value);

  // Get current ET time (minimum allowed)
  const getMinDateTime = () => {
    const now = new Date();
    // Convert to ET (UTC-5 or UTC-4 depending on DST)
    const etTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    return etTime.toISOString().slice(0, 16);
  };

  // Format ET time for display
  const getETDisplay = () => {
    if (!localDateTime) return "";
    try {
      const date = new Date(localDateTime);
      const etString = date.toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${etString} ET`;
    } catch {
      return "";
    }
  };

  const handleChange = (newValue: string) => {
    setLocalDateTime(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-semibold text-gray-900">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          type="datetime-local"
          value={localDateTime}
          onChange={(e) => handleChange(e.target.value)}
          min={getMinDateTime()}
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          style={{
            colorScheme: "light",
            fontSize: "16px",
          }}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      </div>

      {localDateTime && (
        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">
              Scheduled for: {getETDisplay()}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Article will be automatically published at this time (Eastern Time)
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600">
        ⏰ All times are in <strong>Eastern Time (ET)</strong>. You cannot schedule posts in the past.
      </p>
    </div>
  );
}

