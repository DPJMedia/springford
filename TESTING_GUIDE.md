# 🧪 Testing Guide - Spring-Ford Press

## ✅ What's Been Built

1. **Authentication System** - Sign up, login, logout
2. **Dynamic Header** - Shows login/logout based on auth state
3. **Homepage** - Fetches articles from Supabase (falls back to mock data if empty)
4. **Admin Dashboard** - Create, edit, schedule, delete articles
5. **Super Admin Panel** - Assign admin privileges to users
6. **Database** - PostgreSQL with Row Level Security
7. **Storage** - Ready for article images (bucket created)

---

## 🚀 Step-by-Step Testing Walkthrough

### **STEP 1: Check Homepage (Anonymous User)**
1. Open: http://localhost:3000
2. **Verify:**
   - ✅ Site loads with mock articles (since DB is empty)
   - ✅ Header shows "Sign up" and "Log in" buttons
   - ✅ Newsletter signup form is visible
   - ✅ All sections display properly

---

### **STEP 2: Create Your Super Admin Account**
1. Click **"Sign up"** in header (or go to http://localhost:3000/signup)
2. Fill in the form:
   - **Full Name**: Your name
   - **Email**: `dylancobb2525@gmail.com` (IMPORTANT: Must be exactly this!)
   - **Password**: Your password (at least 6 characters)
3. Click **"Create account"**
4. **Verify:**
   - ✅ Success message appears
   - ✅ Redirected to homepage after 2 seconds
   - ✅ Header now shows "Dashboard" and "Log out" buttons
   - ✅ You're automatically logged in

---

### **STEP 3: Access Admin Dashboard**
1. Click **"Dashboard"** in header (or go to http://localhost:3000/admin)
2. **Verify:**
   - ✅ Admin Dashboard loads
   - ✅ Shows "Welcome, [Your Name] (Super Admin)"
   - ✅ Shows stats: 0 total, 0 published, 0 drafts, 0 scheduled
   - ✅ "Manage Users" button visible (only for super admins)
   - ✅ "+ Create New Article" button visible
   - ✅ Empty articles table

---

### **STEP 4: Create Your First Article**
1. Click **"+ Create New Article"**
2. Fill in the form:
   - **Title**: "Welcome to Spring-Ford Press"
   - **Excerpt**: "Your new neighborhood news source"
   - **Content**: Write a few paragraphs of content
   - **Category**: Select "Community"
   - **Neighborhood**: "Town Center"
   - **Town**: "Spring Ford"
   - **Status**: Select "Published"
3. Click **"Create Article"**
4. **Verify:**
   - ✅ Success alert appears
   - ✅ Article appears in the table
   - ✅ Stats update: 1 total, 1 published

---

### **STEP 5: View Article on Homepage**
1. Click **"← Back to Site"** (or go to http://localhost:3000)
2. **Verify:**
   - ✅ Your article is now displayed!
   - ✅ Appears in "Top Stories" section
   - ✅ Shows in "Latest" feed
   - ✅ No mock data anymore (all real from database!)

---

### **STEP 6: Test Article Management**
1. Go back to Admin Dashboard (http://localhost:3000/admin)
2. **Test Edit:**
   - Click "Edit" on your article
   - Change the title
   - Click "Update Article"
   - ✅ Verify changes saved
3. **Test Draft:**
   - Create a new article with Status = "Draft"
   - ✅ Verify it appears in admin but NOT on homepage
4. **Test Schedule:**
   - Create an article with Status = "Scheduled"
   - Set a future date/time
   - ✅ Verify scheduled badge shows in admin
5. **Test Publish:**
   - Click "Publish" on a draft article
   - ✅ Verify it now appears on homepage
6. **Test Delete:**
   - Click "Delete" on an article
   - Confirm deletion
   - ✅ Verify it's removed from table and homepage

---

### **STEP 7: Test User Management (Super Admin Only)**
1. Create a test user account:
   - Log out (click "Log out" in header)
   - Sign up with a different email (e.g., `test@example.com`)
   - ✅ Verify regular user can't see "Dashboard" button
2. Log back in as super admin (`dylancobb2525@gmail.com`)
3. Go to **Admin Dashboard** → Click **"Manage Users"**
4. **Verify:**
   - ✅ See 2 users: You (Super Admin) and test user (User)
   - ✅ Stats show: 2 total, 1 admin, 1 regular user
5. **Grant Admin Privileges:**
   - Click "Make Admin" on test user
   - Confirm action
   - ✅ Verify badge changes to "Admin"
6. **Test as New Admin:**
   - Log out
   - Log in as test user
   - ✅ Verify "Dashboard" button now appears
   - ✅ Verify can create/edit articles
   - ✅ Verify CANNOT see "Manage Users" (only super admin can)
7. **Remove Admin Privileges:**
   - Log back in as super admin
   - Go to Manage Users
   - Click "Remove Admin" on test user
   - ✅ Verify back to "User" role

---

### **STEP 8: Test Filters on Homepage**
1. Create articles in different categories (Government, Business, Community)
2. Create articles in different neighborhoods
3. Go to homepage (http://localhost:3000)
4. Scroll to "Latest" section
5. **Test Filters:**
   - ✅ Filter by Category → Only articles from that category show
   - ✅ Filter by Neighborhood → Only articles from that area show
   - ✅ Filter by Town → Works correctly
   - ✅ Sort by "Oldest" → Articles reorder

---

### **STEP 9: Test Authentication Flow**
1. **Test Logout:**
   - Click "Log out" in header
   - ✅ Verify redirected to homepage
   - ✅ Verify header shows "Sign up" / "Log in" again
   - ✅ Verify can't access /admin (redirects to login)
2. **Test Login:**
   - Click "Log in"
   - Enter your credentials
   - ✅ Verify logged in successfully
   - ✅ Verify redirected to homepage
3. **Test Protected Routes:**
   - Log out
   - Try to visit http://localhost:3000/admin directly
   - ✅ Verify redirected to login page

---

## 🎯 Expected Results Summary

| Feature | Status |
|---------|--------|
| User signup/login | ✅ Working |
| Super admin auto-assignment | ✅ Working |
| Admin dashboard access | ✅ Working |
| Create articles | ✅ Working |
| Edit articles | ✅ Working |
| Delete articles | ✅ Working |
| Publish articles | ✅ Working |
| Schedule articles | ✅ Working |
| Homepage displays real data | ✅ Working |
| Filters work | ✅ Working |
| User management (super admin) | ✅ Working |
| Grant admin privileges | ✅ Working |
| Remove admin privileges | ✅ Working |
| Protected routes | ✅ Working |

---

## 🔍 Troubleshooting

### "Can't find variable: NewsCard" Error
- **Fixed!** Added proper import in page.tsx

### Articles not showing on homepage
- Make sure articles have `status = 'published'`
- Check browser console for errors
- Verify Supabase connection (check .env.local file)

### Can't access admin dashboard
- Make sure you're logged in
- Check that your account has admin privileges
- Verify you signed up with `dylancobb2525@gmail.com` for super admin

### Database connection errors
- Verify .env.local exists with correct credentials
- Check Supabase project is running
- Verify SQL script was executed successfully

---

## 📊 Database Structure

**Tables:**
- `user_profiles` - User accounts and admin status
- `articles` - All news articles

**Security:**
- Public users: Can only view published articles
- Regular users: Can view all published articles
- Admins: Can create/edit/delete all articles
- Super admins: Everything + user management

---

## 🎉 Success Criteria

✅ You can sign up as super admin
✅ You can create articles in admin dashboard
✅ Articles appear on homepage immediately
✅ You can edit/delete articles
✅ You can assign admin privileges to other users
✅ Regular users can't access admin features
✅ All data persists (refresh page, articles stay)

---

## 🚀 Next Steps (After Testing)

1. **Add more articles** - Populate your site with real content
2. **Test with multiple users** - Invite team members
3. **Customize categories** - Add more categories as needed
4. **Add image uploads** - Enhance articles with photos
5. **Deploy to production** - Push to Vercel when ready

---

**Need help?** Let me know what's not working and I'll fix it immediately!

