# News Article Management System - Complete Guide

## 🎉 What Was Built

A comprehensive content management system for your news site with the following features:

### For Admins/Super Admins:
1. **Article Editor** - Full-featured article creation and editing
2. **Rich Content Support** - Title, subtitle, excerpt, full content
3. **Image Management** - Optional image uploads with captions and credits
4. **Publishing Control** - Publish now, schedule for later, or save as draft
5. **Section Management** - Organize articles by section (Hero, World, Local, Sports, etc.)
6. **SEO Tools** - Meta titles and descriptions
7. **Article Options** - Mark as Featured, Breaking News, allow/disable comments
8. **Analytics** - View counts tracked automatically

### For Users:
1. **Clean Homepage** - Professional news layout with hero article, featured stories, and latest news
2. **Article Pages** - Individual article view with related stories
3. **Ad Placement Zones** - Clearly marked areas for monetization
4. **Responsive Design** - Works on all devices

## 📋 Setup Instructions

### Step 1: Run the SQL Script in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/xccfhbteiaxtbslcnbsm
2. Click on **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Open the file `supabase-articles-update.sql` in your project
5. Copy ALL the SQL code and paste it into the query editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. You should see "Articles table and storage setup completed successfully!" in the results

### Step 2: Verify the Setup

Check that the following were created:
- ✅ `articles` table with all columns
- ✅ `article-images` storage bucket
- ✅ RLS policies for articles and storage
- ✅ Indexes for better performance

## 🚀 How to Use the System

### As an Admin:

#### Creating a New Article:

1. **Log in** as an admin (dylancobb2525@gmail.com)
2. **Go to Dashboard** - Click "Log in" and access your dashboard
3. **Navigate to Articles** - Click "Article Management" or "Create New Article"
4. **Fill in the form**:
   - **Title*** (required) - Main headline
   - **Subtitle** (optional) - Secondary headline
   - **Featured Image** (optional) - Upload an image, add caption/credit
   - **Excerpt** (optional) - Summary for article cards
   - **Content*** (required) - Full article text
   - **Section*** - Where it appears (Hero for main feature)
   - **Category** - Additional categorization
   - **Tags** - Comma-separated keywords
   - **SEO Settings** - Meta title/description for search engines
   - **Options**:
     - ☐ Featured Article (prominent display)
     - ☐ Breaking News (top banner)
     - ☐ Allow Comments
   - **Schedule** - Set future publish date (optional)

5. **Choose Action**:
   - **Save as Draft** - Save without publishing
   - **Schedule for Later** - Publish at specified time
   - **Publish Now** - Make live immediately

#### Managing Articles:

1. Go to **Admin Dashboard** → **Article Management**
2. **Filter** articles by status (All, Published, Drafts, Scheduled)
3. **Edit** any article by clicking the "Edit" button
4. **Delete** articles (with confirmation)
5. **View Stats**:
   - Total articles
   - Published count
   - Drafts count
   - Scheduled count
   - Total views

### Sections Explained:

- **Hero** - Main featured article at top of homepage (use sparingly)
- **World** - International news
- **Local** - Community and local news
- **Sports** - Sports coverage
- **Business** - Business and economy
- **Politics** - Political news
- **Technology** - Tech news
- **Entertainment** - Arts and entertainment
- **Opinion** - Opinion pieces
- **General** - Everything else

### Ad Placement Zones:

The homepage and article pages include clearly marked ad zones:

**Homepage:**
- Top Banner (728x90) - Below hero
- Large Rectangle (336x280) - Between sections
- Sidebar Top (300x250)
- Sidebar Middle (300x250)
- Sidebar Bottom Sticky (160x600)
- Bottom Banner (728x90)

**Article Pages:**
- Article Top (336x280)
- Article Middle (300x250)
- Article Bottom (728x90)

## 📝 Best Practices

### Writing Articles:

1. **Use clear headlines** - Be specific and engaging
2. **Add images when possible** - Visual content increases engagement
3. **Write good excerpts** - This shows on cards and in search results
4. **Use sections appropriately** - Don't overuse "Hero"
5. **Add relevant tags** - Helps with organization and SEO
6. **Proofread** - Check spelling and grammar before publishing

### Image Guidelines:

- **Format**: JPG, PNG, or GIF
- **Size**: Up to 10MB
- **Dimensions**: 1200x800px recommended for hero images
- **Quality**: Use high-resolution images
- **Always add**: Caption and photo credit

### SEO Tips:

- **Meta Title**: 50-60 characters
- **Meta Description**: 150-160 characters
- **Include keywords** in title and content
- **Use descriptive slugs** (auto-generated from title)

## 🔒 Permissions

- **Regular Users**: Can only view published articles
- **Admins**: Can create, edit, publish, and delete all articles
- **Super Admins**: Everything admins can do + manage users

## 📊 Analytics

Every article tracks:
- **View Count** - Automatically incremented
- **Published Date** - When it went live
- **Last Updated** - When last modified
- **Author** - Who created it

## 🚨 Important Notes

1. **No mock data** - All articles are now from the database
2. **Images are stored** in Supabase Storage (not in code)
3. **Scheduled articles** auto-publish at the specified time
4. **Drafts are private** - Only admins can see them
5. **Breaking news** appears in a red banner at the top
6. **Featured articles** appear in the "Top Stories" section

## 🐛 Troubleshooting

### "No articles found" on homepage:
- Create and publish at least one article
- Check that status is "published"
- Verify published_at is not in the future

### Images not uploading:
- Check file size (max 10MB)
- Verify you're logged in as admin
- Check Supabase storage bucket exists

### Can't access admin panel:
- Verify you're logged in
- Check your account has is_admin or is_super_admin = true
- Try logging out and back in

## 📱 Mobile Friendly

The entire system is responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

## 🎨 Customization

The design uses your site's color scheme:
- Primary color: Riviera Blue
- Clean, newspaper-style layout
- Inspired by WSJ, Fox News, and CNN

## 💰 Monetization Ready

Ad zones are clearly marked with size and position. When you're ready to monetize:
1. Replace `AdPlaceholder` components with real ad code
2. Sizes are industry-standard (IAB standards)
3. Multiple high-value positions available

---

## Need Help?

If you encounter any issues:
1. Check this guide first
2. Verify the SQL script ran successfully
3. Check browser console for errors
4. Make sure you're logged in as admin

Enjoy your new article management system! 🎉

