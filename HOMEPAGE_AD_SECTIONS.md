# Homepage Ad Sections - Numbered System

## Overview

The homepage now has **8 numbered ad sections** that admins can easily identify and manage. Each section has a unique slot ID and displays a numbered label for admins.

## Database Setup Required

Run this SQL in your Supabase SQL Editor:

```sql
-- File: supabase-homepage-ad-slots.sql

INSERT INTO ad_settings (ad_slot, use_fallback, fallback_ad_code) VALUES
  ('homepage-banner-top', true, NULL),
  ('homepage-sidebar-top', true, NULL),
  ('homepage-sidebar-middle', true, NULL),
  ('homepage-sidebar-bottom', true, NULL),
  ('homepage-content-top', true, NULL),
  ('homepage-content-middle-1', true, NULL),
  ('homepage-content-middle-2', true, NULL),
  ('homepage-banner-bottom', true, NULL)
ON CONFLICT (ad_slot) DO NOTHING;
```

## Ad Sections

### Section 1: Banner Below Hero
- **Slot ID**: `homepage-banner-top`
- **Location**: Directly below the hero article
- **Recommended Size**: 970x90 (10.8:1 ratio)
- **Height**: 96px (h-24)

### Section 2: Sidebar Top (Above Trending)
- **Slot ID**: `homepage-sidebar-top`
- **Location**: Top of right sidebar, above "Trending Now"
- **Recommended Size**: 300x300 (1:1 ratio - Square Box)
- **Height**: 256px (h-64)
- **Behavior**: **STATIC** - Does not move with scroll

### Section 3: Sidebar Middle
- **Slot ID**: `homepage-sidebar-middle`
- **Location**: Right sidebar, between "Trending Now" and "Most Read"
- **Recommended Size**: 300x250 (1.2:1 ratio)
- **Height**: 192px (h-48)

### Section 4: Sidebar Bottom
- **Slot ID**: `homepage-sidebar-bottom`
- **Location**: Bottom of right sidebar, below "Most Read"
- **Recommended Size**: 300x250 (1.2:1 ratio)
- **Height**: 192px (h-48)

### Section 5: Main Content Top
- **Slot ID**: `homepage-content-top`
- **Location**: Main content area, after "Top Stories"
- **Recommended Size**: 728x90 (8:1 ratio)
- **Height**: 96px (h-24)

### Section 6: Main Content Middle 1
- **Slot ID**: `homepage-content-middle-1`
- **Location**: Main content area, after "Politics" section
- **Recommended Size**: 728x90 (8:1 ratio)
- **Height**: 96px (h-24)

### Section 7: Main Content Middle 2
- **Slot ID**: `homepage-content-middle-2`
- **Location**: Main content area, after "Local" section
- **Recommended Size**: 728x90 (8:1 ratio)
- **Height**: 96px (h-24)

### Section 8: Banner Bottom
- **Slot ID**: `homepage-banner-bottom`
- **Location**: Bottom of page, after all content
- **Recommended Size**: 970x90 (10.8:1 ratio)
- **Height**: 96px (h-24)

## Features

### Admin View
- **Numbered Labels**: When logged in as an admin or super admin, you'll see blue numbered labels above each ad section on the homepage
- **Format**: "Section X: Description"
- **Purpose**: Easy identification when managing ads

### Regular User View
- No numbered labels visible
- Clean, professional ad display

### Ad Manager Integration
- All 8 sections are available in the ad manager dropdown
- Sections are clearly labeled with numbers in the dropdown
- Preview panel shows all sections with numbers
- Click any section in the preview to assign an ad

## Using the System

1. **Log in as Admin/Super Admin**
2. **Visit Homepage** - You'll see numbered labels above each ad section
3. **Go to Ad Manager** - All sections are listed with numbers
4. **Create/Edit Ad**:
   - Upload your image
   - Click a numbered section in the preview OR select from dropdown
   - Toggle "Fill section" per slot if needed
   - Set schedule and publish

## Per-Slot Fill Control

Each ad can have different "fill section" settings for each slot:
- **Checked**: Image fills entire space (object-cover) - crops to fit
- **Unchecked**: Image maintains true size (object-contain) - may have empty space

Example: Same ad can fill Section 1 (banner) but not fill Section 2 (sidebar box).

## Special Note: Section 2

Section 2 (Sidebar Top) is designed as a **static box**:
- Larger than other sidebar ads (256px tall vs 192px)
- Does NOT move with scroll
- Perfect for prominent, eye-catching ads
- Square aspect ratio (1:1) recommended

## Article Page Slots

Article pages have their own numbered system:
- **Article: Sidebar Top (Static)** - 500px tall, static
- **Article: Sidebar Bottom (Sticky)** - 500px tall, follows scroll
- **Article: Inline Ad 1** - Within content
- **Article: Inline Ad 2** - Within content

These are separate from homepage sections and maintain their own numbering.

