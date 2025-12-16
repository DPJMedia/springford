# 🚀 Vercel Deployment Guide

## Prerequisites

1. **GitHub Account** - Code is pushed to GitHub
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Supabase Project** - Database is already set up

---

## Step 1: Push to GitHub

The code is ready to push. Make sure you have:
- ✅ All code committed
- ✅ `.env.local` is NOT committed (already in `.gitignore`)
- ✅ All dependencies in `package.json`

---

## Step 2: Deploy to Vercel

### **Option A: Import from GitHub (Recommended)**

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository: `dylancobb2525/springford-press`
4. Vercel will auto-detect Next.js

### **Option B: Vercel CLI**

```bash
npm i -g vercel
vercel
```

---

## Step 3: Configure Environment Variables

**CRITICAL:** You MUST add these environment variables in Vercel:

1. In Vercel dashboard, go to your project
2. Click **Settings** → **Environment Variables**
3. Add these two variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Where to find these values:**
- Go to your Supabase dashboard
- Click **Settings** → **API**
- Copy:
  - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
  - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 4: Configure Supabase Redirect URLs

**IMPORTANT:** Update Supabase to allow your Vercel domain:

1. Go to Supabase dashboard
2. Click **Authentication** → **URL Configuration**
3. Add to **Redirect URLs**:
   - `https://your-vercel-app.vercel.app/auth/callback`
   - `https://your-vercel-app.vercel.app/auth/confirm`
4. Add to **Site URL**:
   - `https://your-vercel-app.vercel.app`

**For Google OAuth (if enabled):**
- Go to Google Cloud Console
- Update OAuth redirect URI to:
  - `https://your-vercel-app.vercel.app/auth/callback`

---

## Step 5: Deploy!

1. Click **"Deploy"** in Vercel
2. Wait for build to complete
3. Your site will be live at: `https://your-app.vercel.app`

---

## ✅ Post-Deployment Checklist

- [ ] Environment variables set in Vercel
- [ ] Supabase redirect URLs updated
- [ ] Google OAuth redirect URI updated (if using)
- [ ] Test login/signup
- [ ] Test article creation
- [ ] Test image uploads
- [ ] Test breaking news
- [ ] Test scheduled publishing

---

## 🔧 Troubleshooting

### **"Invalid API key" error**
- Check environment variables in Vercel
- Make sure `NEXT_PUBLIC_` prefix is included
- Redeploy after adding variables

### **"Redirect URI mismatch"**
- Update Supabase redirect URLs
- Update Google OAuth redirect URI
- Clear browser cache

### **Images not loading**
- Check Supabase Storage bucket permissions
- Verify RLS policies are set correctly

### **Build fails**
- Check build logs in Vercel
- Ensure all dependencies are in `package.json`
- Check for TypeScript errors

---

## 📝 Environment Variables Reference

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Supabase Dashboard → Settings → API |

---

## 🎉 You're Live!

Once deployed, your site will:
- ✅ Work exactly like local development
- ✅ Connect to Supabase database
- ✅ Handle authentication
- ✅ Support all features (articles, images, breaking news, etc.)

**Your peers can now review the live site!** 🚀

