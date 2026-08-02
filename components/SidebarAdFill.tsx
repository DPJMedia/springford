"use client";

import { AdDisplay } from "@/components/AdDisplay";
import { HOMEPAGE_SIDEBAR_FILL_SLOT_IDS } from "@/lib/advertising/adSlots";

/**
 * Three fixed side-column ad slots stacked below the homepage sidebar, directly
 * under "Desktop Home Tier 7" — desktop only. Each is assignable in the Ad Manager
 * ("Desktop Home Side 1-3"). `hidePlaceholder` means an unsold slot renders nothing
 * (the margin lives on the ad element, so empty slots add no whitespace), so tenants
 * without creatives — everyone but Spring-Ford today — show no empty boxes.
 */
export function SidebarAdFill() {
  return (
    <div className="hidden lg:block">
      {HOMEPAGE_SIDEBAR_FILL_SLOT_IDS.map((slot) => (
        <AdDisplay key={slot} adSlot={slot} className="w-full mt-8" hidePlaceholder />
      ))}
    </div>
  );
}
