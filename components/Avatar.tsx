"use client";

import { useState } from "react";
import {
  getAvatarInitials,
  isDiffuseAIUser,
  normalizeAvatarUrl,
} from "@/lib/user/display";

type AvatarProps = {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
};

export function Avatar({ src, name, email, size = "md", className = "" }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-16 h-16 text-2xl",
    xl: "w-32 h-32 text-4xl",
  };

  const safeSrc = normalizeAvatarUrl(src);
  const isDiffuseAI = isDiffuseAIUser(name, email);

  const initials = getAvatarInitials(name, email, { isDiffuseAI });

  if (safeSrc && !imgError) {
    return (
      <img
        src={safeSrc}
        alt={name || "Avatar"}
        className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
        onError={() => setImgError(true)}
        referrerPolicy="no-referrer"
      />
    );
  }

  const bgColor = isDiffuseAI
    ? "bg-gradient-to-br from-[#ff9628] to-[#ff7300]"
    : "bg-[color:var(--color-riviera-blue)]";

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${bgColor} flex items-center justify-center text-white font-black ${className}`}
    >
      {initials}
    </div>
  );
}
