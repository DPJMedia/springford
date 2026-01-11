# Article Sidebar Layout Updates

## Overview

The article page sidebar has been completely redesigned to maximize ad space and improve user engagement with recommended content.

---

## Changes Made

### 1. Wider Sidebar ✅

**Before**: Sidebar was 4 columns (33% width)  
**After**: Sidebar is now 5 columns (42% width)

**Content**: Article content adjusted from 8 columns to 7 columns to accommodate wider sidebar

This gives more prominent space for ads and recommended content.

---

### 2. Larger Top Ad ✅

**New Ad Slot**: `article-sidebar-top`

- **Height**: 320px (`h-80`)
- **Recommended Size**: 336x280 (Large Rectangle)
- **Aspect Ratio**: 1.2:1
- **Behavior**: Sticky on scroll until it reaches the recommended stories section
- **Position**: Top of sidebar, most prominent placement

---

### 3. Recommended Stories Section ✅

**New Component**: `RecommendedArticles.tsx`

**Smart Recommendation Logic**:
1. **First Priority**: Articles with matching tags
2. **Second Priority**: Articles from same section/category
3. **Third Priority**: Recently published articles

**Display**:
- Shows 3 recommended articles
- Each includes thumbnail, title, section, and publish date
- Hover effects for better UX
- Responsive cards with clean design

**Location**: Between top and bottom sidebar ads

---

### 4. Bottom Sidebar Ad ✅

**New Ad Slot**: `article-sidebar-bottom`

- **Height**: 256px (`h-64`)
- **Recommended Size**: 300x250 (Medium Rectangle)
- **Aspect Ratio**: 1.2:1
- **Position**: Below recommended stories section

---

### 5. Total Ad Slots on Article Pages

**Sidebar Ads** (2):
- `article-sidebar-top` - Large, sticky until recommended section
- `article-sidebar-bottom` - Medium, below recommended stories

**Inline Ads** (2):
- `article-inline-1` - Within article content
- `article-inline-2` - Further in article content

**Total**: 4 ad placement opportunities per article

---

## Sticky Behavior

The top sidebar ad (`article-sidebar-top`) is sticky and scrolls with the user **until** it reaches the recommended stories section. This ensures:

- Maximum visibility for the top ad
- Ad doesn't cover recommended content
- Clean transition to bottom ad
- Better user experience

---

## Mobile Behavior

On mobile devices:
- Sidebar stacks below hero section
- Top ad appears first
- Recommended stories follow
- Bottom ad appears last
- All inline ads remain in content flow

---

## Files Modified

1. **`app/article/[slug]/ArticleContent.tsx`**
   - Changed grid from 8/4 to 7/5 columns
   - Added `RecommendedArticles` component
   - Updated sidebar structure with 2 ad slots
   - Added sticky behavior to top ad

2. **`components/RecommendedArticles.tsx`** (NEW)
   - Smart article recommendation logic
   - Fetches based on tags, section, or recency
   - Displays 3 articles with thumbnails
   - Clean, responsive design

3. **`components/AdDisplay.tsx`**
   - Added specific sizing for `article-sidebar-top` (320px)
   - Added specific sizing for `article-sidebar-bottom` (256px)
   - Maintains consistent ad display

4. **`components/AdPreview.tsx`**
   - Updated article preview to show 7/5 column split
   - Shows both sidebar ad slots
   - Displays recommended stories placeholder
   - Accurate preview of live layout

5. **`supabase-article-sidebar-ads.sql`** (NEW)
   - Migration to add new ad slots to database

---

## Database Migration Required

**File**: `supabase-article-sidebar-ads.sql`

Run this in your Supabase SQL Editor to add the new ad slots:

```sql
INSERT INTO ad_settings (ad_slot, use_fallback, fallback_ad_code)
VALUES 
  ('article-sidebar-top', true, 'diffuse-ai'),
  ('article-sidebar-bottom', true, 'diffuse-ai')
ON CONFLICT (ad_slot) DO NOTHING;
```

---

## Ad Slot Summary

### Homepage Ads
- `homepage-banner` - Top banner (970x90 or 728x90)
- `homepage-sidebar` - Right sidebar (300x250)

### Article Page Ads
- `article-sidebar-top` - **NEW** - Large top sidebar (336x280) - Sticky
- `article-sidebar-bottom` - **NEW** - Medium bottom sidebar (300x250)
- `article-inline-1` - First inline ad (728x90)
- `article-inline-2` - Second inline ad (728x90)

**Total Ad Slots**: 6 (2 homepage + 4 article page)

---

## Benefits

✅ **More Ad Revenue**: 4 ad slots per article (was 3)  
✅ **Better Engagement**: Smart recommended stories keep users on site  
✅ **Larger Ads**: Bigger sidebar allows for more prominent ad sizes  
✅ **Sticky Top Ad**: Maximum visibility without being intrusive  
✅ **Filled White Space**: Sidebar is now fully utilized  
✅ **Consistent Layout**: Same structure across all articles  

---

## Testing Checklist

- [ ] Run `supabase-article-sidebar-ads.sql` migration
- [ ] Create test ad for `article-sidebar-top`
- [ ] Create test ad for `article-sidebar-bottom`
- [ ] View article on desktop - verify sticky behavior
- [ ] View article on mobile - verify stacking order
- [ ] Verify recommended stories show relevant articles
- [ ] Check that all 4 ad slots display correctly
- [ ] Test with and without ads assigned to slots

---

## Next Steps

1. Run the SQL migration in Supabase
2. Upload ads to the new sidebar slots in Ad Manager
3. Monitor performance and user engagement
4. Consider A/B testing different ad sizes if needed



