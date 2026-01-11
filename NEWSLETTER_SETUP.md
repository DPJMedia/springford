# Newsletter Functionality Setup Guide

## ✅ What Was Implemented

1. **Newsletter Subscription Checkbox** - Added to signup page (both email and Google signup)
2. **Smart Newsletter Form** - Shows different content based on user status:
   - Not logged in: Shows "Sign up today" prompt
   - Logged in but not subscribed: Shows newsletter subscription form
   - Already subscribed: Hidden (doesn't appear)
3. **Thank You Modal** - Clean popup appears when user subscribes
4. **Database Tracking** - `newsletter_subscribed` field tracks subscription status
5. **Welcome Email** - API endpoint ready for email sending

---

## 🔧 SUPABASE SETUP REQUIRED

### **STEP 1: Run Database Migration** (2 minutes)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xccfhbteiaxtbslcnbsm
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-newsletter-migration.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see: "Newsletter subscription column added successfully!"

This will:
- Add `newsletter_subscribed` column to `user_profiles` table
- Update the `handle_new_user()` function to accept newsletter preference
- Create an index for better performance

---

### **STEP 2: Set Up Welcome Email** (10 minutes)

You have two options:

#### **Option A: Supabase Email Templates** (Recommended - Free)

1. Go to **Authentication** → **Email Templates** in Supabase Dashboard
2. Click **Create New Template**
3. Name it: `newsletter_welcome`
4. Subject: `Welcome to Spring-Ford Press Newsletter!`
5. Copy this HTML content:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #3391af 0%, #2b7a92 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Spring-Ford Press!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Thank you for subscribing to our newsletter! You now have access to premium content and exclusive insights.</p>
    
    <h2 style="color: #3391af; font-size: 22px; margin-top: 30px; margin-bottom: 15px;">What You Can Expect:</h2>
    
    <ul style="list-style: none; padding: 0; margin: 0;">
      <li style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        <strong style="color: #3391af;">📰 Exclusive Breaking News</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Get the first alerts on important neighborhood stories before they're published.</p>
      </li>
      <li style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        <strong style="color: #3391af;">🏛️ Council Meeting Previews</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Weekly summaries of upcoming city council agendas and key decisions.</p>
      </li>
      <li style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        <strong style="color: #3391af;">🎯 Neighborhood Deep Dives</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">In-depth reporting on local issues affecting your community.</p>
      </li>
      <li style="padding: 12px 0; border-bottom: 1px solid #f3f4f6;">
        <strong style="color: #3391af;">📅 Event Calendar</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Curated list of important community events and meetings.</p>
      </li>
      <li style="padding: 12px 0;">
        <strong style="color: #3391af;">💡 Insider Insights</strong>
        <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Behind-the-scenes perspectives from our local reporting team.</p>
      </li>
    </ul>
    
    <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin-top: 30px;">
      <p style="margin: 0; font-size: 14px; color: #6b7280;">
        <strong style="color: #3391af;">No spam. Ever.</strong> We respect your inbox and only send you the most important news and updates.
      </p>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
      Stay informed, stay connected.<br>
      <strong style="color: #3391af;">The Spring-Ford Press Team</strong>
    </p>
  </div>
</body>
</html>
```

6. Save the template
7. Update the API route to use this template (or set up a Supabase Edge Function to trigger it)

#### **Option B: Use Resend or Another Email Service** (More Control)

1. Sign up for Resend: https://resend.com
2. Get your API key
3. Add `RESEND_API_KEY` to your Vercel environment variables
4. Update `app/api/newsletter/subscribe/route.ts` to use Resend

---

## 🧪 How to Test

### Test 1: New User Signup with Newsletter
1. Go to http://localhost:3000/signup
2. Check the "Sign up for our newsletter" checkbox
3. Complete signup
4. Go to homepage - newsletter box should NOT appear (already subscribed)

### Test 2: New User Signup without Newsletter
1. Go to http://localhost:3000/signup
2. Don't check the newsletter checkbox
3. Complete signup
4. Go to homepage - newsletter box SHOULD appear
5. Click "Subscribe" - thank you modal appears
6. Refresh page - newsletter box should be gone

### Test 3: Not Logged In
1. Log out (if logged in)
2. Go to homepage
3. Should see "Sign up today" prompt instead of newsletter form
4. Click "Create Account" - should go to signup page

### Test 4: Google Signup with Newsletter
1. Go to http://localhost:3000/signup
2. Check newsletter checkbox
3. Click "Continue with Google"
4. Complete Google signup
5. Newsletter preference should be saved

---

## 📝 Notes

- The newsletter form automatically hides once a user subscribes
- Users can subscribe during signup OR later from the homepage
- The welcome email will be sent when they subscribe (once you set up email templates)
- All subscription status is tracked in the `user_profiles.newsletter_subscribed` field



