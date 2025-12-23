# Ad Manager Setup Guide

This guide will help you set up the Ad Manager system for your news site.

## Database Setup

1. **Run the migration scripts** in your Supabase SQL Editor (in this order):
   - Open Supabase Dashboard → SQL Editor
   - **First**: Copy and paste the contents of `supabase-ads-migration.sql` and click "Run"
   - **Second**: Copy and paste the contents of `supabase-ads-add-missing-columns.sql` and click "Run"
   - **Third**: Copy and paste the contents of `supabase-storage-ads-policies.sql` and click "Run"

2. **Create Storage Bucket for Ad Images**:
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `ads`
   - Public: **Yes** (so ads can be displayed)
   - Click "Create bucket"

3. **Set Storage Policies** (REQUIRED):
   - Go to Supabase Dashboard → SQL Editor
   - Copy and paste the contents of `supabase-storage-ads-policies.sql`
   - Click "Run" to execute
   - This creates the necessary RLS policies for authenticated users to upload images
   - **Important**: Without these policies, you'll get "row-level security policy" errors when uploading

## Ad Slots

The system includes 4 predefined ad slots:

1. **homepage-sidebar** - Sidebar ads on the homepage
2. **article-sidebar** - Sidebar ads on article pages
3. **homepage-banner** - Banner ads on the homepage (top and bottom)
4. **article-inline** - Inline ads within article content

## Using the Ad Manager

### Accessing the Ad Manager

1. Log in as a **Super Admin**
2. Go to Admin Dashboard
3. Click "Ad Manager" card

### Creating an Ad

1. Click "+ New Ad" button
2. **Upload Image**:
   - Click "Choose Image" to select an image file
   - Click "Upload" to upload it
   - Or enter an image URL directly
3. **Fill in details**:
   - **Title** (optional) - Internal name for the ad
   - **Link URL** (required) - Where users go when they click the ad
   - **Ad Slot** (required) - Where the ad will appear
   - **Start Date** (required) - When the ad becomes active
   - **End Date** (required) - When the ad expires
   - **Active** - Toggle to enable/disable the ad
4. Click "Create Ad"

### Managing Ads

- **Edit**: Click "Edit" to modify an ad
- **Activate/Deactivate**: Toggle the active status
- **Delete**: Remove an ad permanently (with confirmation)

### Ad Settings

Click "Settings" to configure fallback behavior:

- **Use Fallback**: Toggle whether to show Diffuse.AI ads when no active ad is available
- Each ad slot can be configured independently

## How Ads Work

1. **Active Ads**: Ads are automatically displayed when:
   - `is_active` is `true`
   - Current date is between `start_date` and `end_date`
   - The ad slot matches the location

2. **Fallback Ads**: When no active ad is available:
   - If fallback is enabled for that slot, a Diffuse.AI placeholder is shown
   - If fallback is disabled, nothing is displayed

3. **Automatic Expiration**: Ads automatically stop displaying after their `end_date` passes

## Best Practices

1. **Image Sizes**: 
   - Sidebar ads: 300x250px or 336x280px recommended
   - Banner ads: 728x90px recommended
   - Use high-quality images for best results

2. **Scheduling**: 
   - Set start dates in advance for scheduled campaigns
   - Always set end dates to prevent ads from running indefinitely

3. **Testing**: 
   - Create test ads with short date ranges to verify placement
   - Check both homepage and article pages

4. **Performance**: 
   - Optimize images before uploading (compress, resize)
   - Use appropriate file formats (JPG for photos, PNG for graphics)

## Troubleshooting

**Ads not showing?**
- Check that the ad is active
- Verify the current date is between start and end dates
- Check that the ad slot matches the location
- Verify fallback settings if no ads are configured

**Image upload fails?**
- Ensure the `ads` storage bucket exists and is public
- Check file size (should be under 5MB)
- Verify you're logged in as a Super Admin

**Ad appears in wrong location?**
- Check the ad slot assignment
- Verify the ad slot name matches exactly (case-sensitive)

