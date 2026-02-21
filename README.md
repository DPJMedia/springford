# News Site Platform with DiffuseAI Integration

A modern, full-featured news website platform built with Next.js, TypeScript, Tailwind CSS, and Supabase. Includes seamless integration with [DiffuseAI](https://diffuse-ai-blush.vercel.app) for AI-powered content generation.

**Live Site:** [Spring-Ford Press](https://springford.press)


---

## 🚀 Features

### Core Features
- 📰 Complete article management system with block-based rich text editor
- 🔐 User authentication (Email + Google OAuth)
- 👥 Role-based access control (Admin, Super Admin, Subscriber)
- 🚨 Breaking news with automatic expiration
- 📅 Scheduled article publishing
- 🖼️ Image uploads with captions and alt text
- 📱 Fully responsive design
- 🔍 SEO optimization with meta tags
- 📊 Article view tracking and analytics
- 🏷️ Tag management with hide/unhide functionality
- 📑 Article archiving system
- 🎨 Ad management with multiple placement options

### DiffuseAI Integration ✨
- 🤖 Import AI-generated articles directly into your CMS
- 🔗 Account pairing between your news site and DiffuseAI
- 📂 View all DiffuseAI projects organized by workspace
- 🔒 Support for private projects
- 👥 Automatic creator attribution
- 🎯 Smart field mapping (title, content, tags, categories, meta data)
- 🔄 Reconnect capability for switching DiffuseAI accounts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 with App Router |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS + Custom CSS Variables |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Deployment** | Vercel |
| **AI Integration** | DiffuseAI API |

---

## 📋 Prerequisites

Before setting up the site, ensure you have:

- **Node.js 18+** and npm/yarn
- **Supabase account** (free tier works)
- **Vercel account** (for deployment)
- **DiffuseAI account** (optional, for AI content generation)

---

## 🎯 Quick Start (For New Sites)

### Step 1: Clone and Install

```bash
git clone <your-repo-url>
cd news_site
npm install
```

### Step 2: Environment Variables

Create `.env.local` in the root directory:

```env
# Your News Site Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# DiffuseAI Supabase (for integration)
NEXT_PUBLIC_DIFFUSE_SUPABASE_URL=https://ddwcafuxatmejxcfkwhu.supabase.co
NEXT_PUBLIC_DIFFUSE_ANON_KEY=your_diffuse_anon_key_here

# SendGrid (newsletter welcome emails)
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=admin@dpjmedia.com
SENDGRID_FROM_NAME=Spring-Ford Press
NEXT_PUBLIC_SITE_URL=https://springford.press
```

### Step 3: Database Setup

#### A. Your News Site Database

Run these SQL scripts in your Supabase SQL Editor **in this exact order**:

```sql
-- 1. CREATE MAIN SCHEMA
-- Copy this from the Database Schema section below

-- 2. CREATE STORAGE BUCKETS
-- Go to Supabase Storage → Create bucket "article-images" (public)
-- Go to Supabase Storage → Create bucket "ads" (public)

-- 3. RUN THIS FOR DIFFUSE INTEGRATION
CREATE TABLE diffuse_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  springford_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  diffuse_user_id text NOT NULL,
  diffuse_email text,
  connected_at timestamptz DEFAULT now(),
  UNIQUE(springford_user_id)
);

CREATE TABLE diffuse_imported_articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  springford_article_id uuid REFERENCES articles(id) ON DELETE CASCADE,
  diffuse_project_id text NOT NULL,
  diffuse_output_id text NOT NULL,
  imported_at timestamptz DEFAULT now(),
  imported_by uuid REFERENCES auth.users(id),
  UNIQUE(diffuse_output_id)
);

CREATE TABLE hidden_tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_name text NOT NULL UNIQUE,
  hidden_at timestamptz DEFAULT now(),
  hidden_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE diffuse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE diffuse_imported_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diffuse_connections
CREATE POLICY "Users can view own connection"
ON diffuse_connections FOR SELECT
TO authenticated
USING (springford_user_id = auth.uid());

CREATE POLICY "Users can create own connection"
ON diffuse_connections FOR INSERT
TO authenticated
WITH CHECK (springford_user_id = auth.uid());

CREATE POLICY "Users can delete own connection"
ON diffuse_connections FOR DELETE
TO authenticated
USING (springford_user_id = auth.uid());

-- RLS Policies for diffuse_imported_articles
CREATE POLICY "Anyone can view imported articles"
ON diffuse_imported_articles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can create imported articles"
ON diffuse_imported_articles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
  )
);

-- RLS Policies for hidden_tags
CREATE POLICY "Admins can view hidden tags"
ON hidden_tags FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
  )
);

CREATE POLICY "Admins can hide tags"
ON hidden_tags FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
  )
);

CREATE POLICY "Admins can unhide tags"
ON hidden_tags FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND (user_profiles.is_admin = true OR user_profiles.is_super_admin = true)
  )
);

CREATE INDEX idx_hidden_tags_tag_name ON hidden_tags(tag_name);
```

#### B. DiffuseAI Database Setup (Required for Integration)

**If you're using the shared DiffuseAI instance** (most common):
- No setup needed! Just ensure you have the correct `NEXT_PUBLIC_DIFFUSE_SUPABASE_URL` and key.

**If you're setting up your own DiffuseAI instance:**

Run this in your DiffuseAI Supabase:

```sql
-- 1. Create connection tracking table
CREATE TABLE springford_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  diffuse_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  springford_email text NOT NULL,
  connected_at timestamptz DEFAULT now(),
  UNIQUE(diffuse_user_id)
);

ALTER TABLE springford_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own springford connection"
ON springford_connections FOR SELECT
TO authenticated
USING (diffuse_user_id = auth.uid());

CREATE POLICY "Users can create own springford connection"
ON springford_connections FOR INSERT
TO authenticated
WITH CHECK (diffuse_user_id = auth.uid());

CREATE POLICY "Users can delete own springford connection"
ON springford_connections FOR DELETE
TO authenticated
USING (diffuse_user_id = auth.uid());

-- 2. Allow public read access to user profiles (for creator names)
CREATE POLICY "allow_public_read_for_integrations"
ON public.user_profiles
FOR SELECT
TO public
USING (true);

-- 3. Ensure RLS policies allow project visibility
-- (This should already be set up in DiffuseAI, but verify)
CREATE POLICY "public_can_read_projects"
ON diffuse_projects
FOR SELECT
TO public
USING (true);

CREATE POLICY "public_can_read_workspaces"
ON diffuse_workspaces
FOR SELECT
TO public
USING (true);

CREATE POLICY "public_can_read_workspace_members"
ON diffuse_workspace_members
FOR SELECT
TO public
USING (true);

CREATE POLICY "public_can_read_outputs"
ON diffuse_project_outputs
FOR SELECT
TO public
USING (true);
```

### Step 4: Configure Authentication

1. Go to Supabase → Authentication → URL Configuration
2. Add your site URLs:
   - Site URL: `https://your-site.vercel.app`
   - Redirect URLs: 
     - `https://your-site.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
3. Enable Email provider
4. (Optional) Enable Google OAuth

### Step 5: Create First Super Admin

After signing up your first user, run this SQL in Supabase:

```sql
UPDATE user_profiles 
SET is_super_admin = true, is_admin = true
WHERE email = 'your-email@example.com';
```

### Step 6: Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### Step 7: Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

---

## 🔗 DiffuseAI Integration Guide

### What is DiffuseAI?

DiffuseAI is an AI-powered content generation platform that turns audio recordings or text into fully formatted articles. The integration allows admins to:
- Import AI-generated articles directly into the CMS
- View all DiffuseAI projects organized by workspace
- Automatically map AI content to article fields

### How It Works

1. **Account Pairing**: Admins connect their DiffuseAI account through the admin panel
2. **View Projects**: See all DiffuseAI projects organized by workspace
3. **Import Content**: Click "Turn into Article" on any project to import it as a draft
4. **Auto-Mapping**: The system automatically maps:
   - Title → Title
   - Author → "Powered by diffuse.ai"
   - Subtitle → Subtitle
   - Excerpt → Excerpt
   - Content → Content Block #1
   - Category → Category (if match found)
   - Tags → Tags (creates if needed)
   - Meta fields → SEO meta data

### Connecting DiffuseAI

1. Go to Admin Dashboard
2. Click "diffuse.ai integration"
3. Enter your DiffuseAI email and password
4. Click "Connect Account"
5. Your workspaces and projects will appear automatically

### Project Visibility

Projects appear based on:
- **Home Organization** (`workspace_id`): Where the project is housed
- **Visibility Settings** (`visible_to_orgs`): Which workspaces can see it
- **Private Projects**: Only visible to the creator

### Troubleshooting DiffuseAI Integration

**"No organizations found"**
- Ensure you're a member of at least one workspace in DiffuseAI
- Check that RLS policies in DiffuseAI allow public reads

**"Unknown" creator names**
- Run the `allow_public_read_for_integrations` policy in DiffuseAI database
- This allows the news site to fetch creator names

**Projects not appearing**
- Ensure projects have correct `workspace_id` or `visible_to_orgs` settings
- Check that you're a member of the workspace the project belongs to

---

## 📁 Project Structure

```
├── app/
│   ├── admin/              # Admin dashboard and management
│   │   ├── articles/       # Article CRUD
│   │   ├── ads/           # Ad management
│   │   ├── users/         # User management
│   │   └── diffuse/       # DiffuseAI integration
│   ├── article/[slug]/    # Public article display
│   ├── auth/              # Authentication pages
│   ├── section/           # Section pages
│   ├── tag/               # Tag pages
│   └── page.tsx           # Homepage
├── components/            # Reusable React components
│   ├── BlockEditor.tsx    # Block-based content editor
│   ├── RichTextEditor.tsx # Rich text component
│   ├── TagSelector.tsx    # Tag management UI
│   └── ...
├── lib/
│   ├── supabase/         # Supabase client setup
│   ├── diffuse/          # DiffuseAI client
│   └── types/            # TypeScript definitions
├── middleware.ts          # Auth middleware
└── public/               # Static assets
```

---

## 🎨 Customization for New Sites

### 1. Branding

Update these files with your branding:
- `app/globals.css` - Color scheme (CSS variables)
- `public/favicon.ico` - Site icon
- `app/layout.tsx` - Site name and metadata

### 2. Sections/Categories

Add your news sections in:
- `lib/sections.ts` (if it exists) or directly in components
- Common sections: News, Sports, Opinion, Arts, Local

### 3. Navigation

Customize the header in `components/Header.tsx`

### 4. Email Templates

Configure in Supabase → Authentication → Email Templates

---

## 🔐 User Roles

| Role | Permissions |
|------|------------|
| **Super Admin** | Full access to everything including user management |
| **Admin** | Can create, edit, and manage articles and ads |
| **Subscriber** | Can read articles and comment (if enabled) |

---

## 📊 Key Features Explained

### Article Editor
- Block-based content system
- Rich text formatting (bold, italic, links, lists)
- Image uploads with captions
- Multiple content blocks per article
- Markdown support

### Ad Management
- Multiple ad slot types (banners, sidebars, inline)
- Scheduling (start/end dates)
- Impression/click tracking
- Fill section management
- Preview before publishing

### Breaking News
- Set duration (hours)
- Automatic badge removal after expiration
- Priority display on homepage

### Scheduled Publishing
- Set future publish dates
- Auto-publishes at scheduled time
- Draft → Scheduled → Published workflow

### Article Archiving
- Hide articles from public view without deleting
- Preserves view counts and data
- Can be republished later

### Tag Management
- Create custom tags
- Hide rarely-used tags from selector
- Unhide tags when needed
- Tags remain on articles even when hidden

---

## 🚀 Performance Tips

1. **Image Optimization**: Always upload images through Supabase Storage
2. **Caching**: Next.js automatically caches pages
3. **Database Indexes**: Already optimized for common queries
4. **Lazy Loading**: Images and components load on demand

---

## 🔧 Environment Variables Reference

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=          # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Your Supabase anon key

# Optional (for DiffuseAI integration)
NEXT_PUBLIC_DIFFUSE_SUPABASE_URL=  # DiffuseAI Supabase URL
NEXT_PUBLIC_DIFFUSE_ANON_KEY=      # DiffuseAI anon key
```

---

## 📝 Database Schema (Main Tables)

```sql
-- Core tables structure (simplified)
user_profiles (
  id uuid,
  email text,
  full_name text,
  is_admin boolean,
  is_super_admin boolean,
  avatar_url text
)

articles (
  id uuid,
  title text,
  slug text UNIQUE,
  content_blocks jsonb,
  status text, -- draft, scheduled, published, archived
  author_id uuid,
  author_name text,
  category text,
  tags text[],
  view_count integer,
  is_breaking_news boolean,
  breaking_news_duration integer,
  scheduled_publish_at timestamptz,
  published_at timestamptz
)

ads (
  id uuid,
  title text,
  ad_slot text,
  image_url text,
  link_url text,
  click_count integer,
  impression_count integer,
  is_active boolean,
  start_date timestamptz,
  end_date timestamptz
)

diffuse_connections (
  id uuid,
  springford_user_id uuid,
  diffuse_user_id text,
  diffuse_email text
)

hidden_tags (
  id uuid,
  tag_name text UNIQUE
)
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot connect to Supabase"
- Check environment variables in `.env.local`
- Verify Supabase project is active
- Check network/firewall settings

### Issue: "403 Forbidden" when accessing admin
- Verify user has `is_admin` or `is_super_admin` set to true
- Check RLS policies are correctly set up

### Issue: Images not uploading
- Ensure storage buckets are created and set to public
- Check file size limits (default 50MB)
- Verify RLS policies on storage buckets

### Issue: DiffuseAI projects not loading
- Verify DiffuseAI credentials in environment variables
- Check RLS policies in DiffuseAI database
- Ensure user is a member of workspaces in DiffuseAI

---

## 📞 Support

For issues or questions:
1. Check this README thoroughly
2. Review error messages in browser console
3. Check Supabase logs
4. Contact developer

---

## 🔄 Future Proofing

This codebase is designed to be easily replicated for multiple news sites:

1. **DiffuseAI Integration**: Automatically works with any DiffuseAI account
2. **Modular Design**: Components can be reused across sites
3. **Database Schema**: Standardized across all news sites
4. **Environment-Based**: Each site has its own Supabase instance
5. **Scalable**: Supports unlimited users, articles, and workspaces

To create a new site:
1. Clone this repo
2. Create new Supabase project
3. Run database setup
4. Update `.env.local` with new credentials
5. Customize branding
6. Deploy to Vercel

---

## 📄 License

Private project - All rights reserved

---

**Built with ❤️ using Next.js, TypeScript, and Supabase**

**DiffuseAI Integration**: Powered by [DiffuseAI](https://diffuse-ai-blush.vercel.app)
