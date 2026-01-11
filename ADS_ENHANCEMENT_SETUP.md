# Ad Manager Enhancement Setup

This guide covers the enhanced Ad Manager features including split-screen preview, multiple slot selection, precise scheduling, and ad rotation.

## Database Setup

1. **Run the enhancement migration** in your Supabase SQL Editor:
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `supabase-ads-enhancement.sql`
   - Click "Run" to execute the migration

   This migration adds:
   - `runtime_seconds` column for ad rotation
   - `display_order` column for rotation sequence
   - `ad_slot_assignments` junction table for multiple slots per ad

## New Features

### 1. Split-Screen Editor with Preview

When creating or editing an ad:
- **Left Side**: Ad editor form with all fields
- **Right Side**: Live preview of the website (homepage or article page)
- **Click on ad slots** in the preview to select where the ad should appear
- Selected slots are automatically added to the form

### 2. Multiple Ad Slot Selection

- Select multiple ad slots for a single ad
- The ad will appear in all selected locations
- Click slots in the preview or use the multi-select interface
- Remove slots by clicking the × on selected slot badges

### 3. Precise Date & Time Scheduling

- **Start Date & Time**: Exact moment the ad goes live
- **End Date & Time**: Exact moment the ad expires
- Ads won't display before start time or after end time
- Use the date and time pickers for precise control

### 4. Ad Rotation with Runtime

When multiple ads are assigned to the same slot:

1. **Runtime Required**: System automatically detects when multiple ads share a slot
2. **Set Runtime**: Each ad needs a `runtime_seconds` value (e.g., 10 seconds)
3. **Display Order**: Set `display_order` to control rotation sequence (lower numbers first)
4. **Automatic Rotation**: Ads rotate automatically based on their runtime

**Example:**
- Ad 1: Runtime 10 seconds, Display Order 0
- Ad 2: Runtime 15 seconds, Display Order 1
- Ad 3: Runtime 5 seconds, Display Order 2

Result: Ad 1 displays for 10s → Ad 2 for 15s → Ad 3 for 5s → repeat

### 5. Disable/Enable Ads

- Toggle ads on/off without deleting them
- Disabled ads won't display even if within their date range
- Useful for temporarily pausing campaigns

## Using the Enhanced Ad Manager

### Creating an Ad with Preview

1. Click "+ New Ad"
2. **Upload Image** or enter image URL
3. **Click ad slots in the preview** to select locations
   - Switch between "Homepage" and "Article Page" preview modes
   - Click highlighted ad slot areas to add/remove selections
4. Fill in:
   - Title (optional)
   - Link URL
   - Start Date & Time
   - End Date & Time
   - Runtime (if multiple ads in same slot)
   - Display Order (for rotation sequence)
5. Click "Publish Ad"

### Editing an Ad

1. Click "Edit" on any ad in the table
2. The split-screen editor opens with current ad data
3. Modify any fields
4. Click/deselect slots in the preview
5. Click "Update Ad"

### Managing Multiple Ads in Same Slot

1. Create first ad for a slot (no runtime needed)
2. Create second ad for the same slot
3. System detects multiple ads and requires runtime
4. Set runtime for both ads
5. Set display order to control sequence
6. Ads will automatically rotate

## Best Practices

1. **Runtime Values**:
   - Use consistent runtimes for smoother rotation
   - Consider user experience (10-30 seconds is typical)
   - Test rotation to ensure smooth transitions

2. **Display Order**:
   - Start with 0, 1, 2, etc.
   - Lower numbers display first
   - Can be adjusted later without recreating ads

3. **Scheduling**:
   - Use precise times for time-sensitive campaigns
   - Set end times to prevent ads running indefinitely
   - Consider timezone differences

4. **Multiple Slots**:
   - Use when same ad should appear in multiple locations
   - Each slot maintains its own rotation if multiple ads exist
   - Useful for brand consistency across the site

## Troubleshooting

**Rotation not working?**
- Ensure all ads in the slot have `runtime_seconds` set
- Check that ads are active and within date range
- Verify `display_order` is set correctly

**Ad not appearing?**
- Check start/end date and time
- Verify ad is active (not disabled)
- Confirm slot is selected
- Check if fallback is enabled (may show placeholder instead)

**Preview not updating?**
- Upload image or enter image URL
- Click ad slots in preview to see selection
- Switch between Homepage/Article preview modes



