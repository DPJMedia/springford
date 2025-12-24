# 🧪 Spring-Ford Press - New Features Testing Guide

**For Super Admins & Admins**

---

## 📱 Getting Started

1. Visit: **https://springford.press**
2. Log in with your admin account
3. Follow this guide to test each new feature

---

## 🎨 **1. HOMEPAGE & NAVIGATION**

### New Navigation Categories
**What Changed:** Simplified, local-focused navigation

**How to Test:**
1. Look at the top menu bar
2. **New sections** (in order):
   - Top Stories
   - Latest
   - Spring City
   - Royersford
   - Limerick
   - Upper Providence
   - School District
   - Politics
   - Business
   - Events
   - Opinion
3. Click each section to verify articles display correctly

### Mobile Responsive Menu
**What Changed:** Hamburger menu for mobile/tablets

**How to Test:**
1. Resize your browser window to be narrow (or use your phone)
2. Look for **hamburger menu icon** (☰) in top right
3. Click it to open navigation dropdown
4. Test clicking different sections
5. Menu should close after selecting a section

### Homepage Sidebar Updates
**What Changed:** New "Editor's Picks" and enhanced "Most Read"

**How to Test:**
1. Scroll to the right sidebar on homepage
2. Look for **"Editor's Picks"** section
3. Look for **"Most Read"** section with view counts
4. Both should display articles (if configured)

---

## 📝 **2. ARTICLE CREATION & EDITING**

### Rich Text Editor
**What Changed:** Full rich text editing with formatting options

**How to Test:**
1. Go to **Admin Center → Articles → Create Article**
2. In the article content blocks, test these features:

#### **Bold Text:**
- Select text and click **B** button
- Text should appear bold in editor
- Publish and verify it's bold on live article

#### **Italic Text:**
- Select text and click **I** button
- Text should appear italic in editor
- Publish and verify it's italic on live article

#### **Add Links:**
- Select text and click **🔗** button
- Paste a URL (e.g., https://google.com)
- Text should turn blue
- Publish and verify link is clickable

#### **Mention Other Articles:**
- Type **@** in the editor
- Dropdown should appear with all articles
- Search by typing article title
- Select an article
- Blue link should appear in editor
- Publish and verify article link works

### Category Dropdown
**What Changed:** Dropdown instead of free text for categories

**How to Test:**
1. When creating/editing an article
2. Look for **"Category"** field
3. Should be a **dropdown menu** with all 11 categories
4. Select a category
5. Save article and verify category displays correctly

### Tag Management
**What Changed:** Better tag system with existing/new options

**How to Test:**
1. When creating/editing an article
2. Go to **"Tags"** section
3. Click **"Use Existing"** to see all current tags
4. OR click **"Create New"** to add a new tag
5. Tags should appear as blue pills below
6. Save and verify tags display on published article

### Spellchecker
**What Changed:** Built-in spellcheck

**How to Test:**
1. Type in article editor
2. Misspell a word (e.g., "testt")
3. Red underline should appear
4. Right-click to see spelling suggestions

---

## 📰 **3. PUBLISHED ARTICLES**

### Share Button & Tracking
**What Changed:** New share button with tracking

**How to Test:**
1. Open any published article
2. Look for **"Share"** icon with text
3. Click the share button
4. Share dialog should open (or link copied)
5. Go to **Admin Center → Manage Articles**
6. Find that article and check **"Share Count"** column
7. Should show at least 1 share

### Published/Updated Timestamps
**What Changed:** Single-line date format

**How to Test:**
1. Open any published article
2. Look below the headline
3. Should show: **"Published [date] at [time]"**
4. If updated: **"Published [date] (Updated [date])"**
5. Format should be clean and single-line

### Clickable Tags
**What Changed:** Tags are now links

**How to Test:**
1. Open any article with tags (bottom of article)
2. Click on a tag
3. Should open a **tag page** showing all articles with that tag
4. Tag name should display at top of page

### Clickable Author Names
**What Changed:** Author names link to profile pages

**How to Test:**
1. Open any article
2. Click on the **author's name** (near headline)
3. Should open **author profile page** with:
   - Author's name
   - Username
   - Profile picture (if uploaded)
   - All articles by that author
4. Click on an article to verify it opens

---

## 🔔 **4. ADMIN NOTIFICATIONS** *(Admins & Super Admins Only)*

### Notification Bell
**What Changed:** Real-time alerts for article/ad changes

**How to Test:**
1. Look at **top right** of menu bar (next to your profile)
2. Should see a **bell icon (🔔)**
3. Red badge shows unread notification count

### Test Notifications:
1. **As Admin 1:** Create, edit, or publish an article
2. **As Admin 2:** Refresh page
3. Click the **bell icon**
4. Should see notification: *"[Name] published/edited an article"*
5. Click notification → should take you to Article Manager
6. Click **X** to dismiss notification

### Ad Notifications *(Super Admins Only)*:
1. **As Super Admin 1:** Create or update an ad
2. **As Super Admin 2:** Refresh page
3. Bell icon should show new notification
4. Click notification → should take you to Ad Manager

---

## 👤 **5. USER PROFILES**

### Upload Profile Picture
**What Changed:** Users can upload avatars

**How to Test:**
1. Click your **profile icon** (top right)
2. Click **"Profile"**
3. Look for **"Profile Picture"** section
4. Click **"Choose File"** and select an image
5. Click **"Upload"**
6. Avatar should appear:
   - In header (top right)
   - Next to your name in articles you write
   - In User Management (for admins)

### Edit Name & Username
**What Changed:** Users can customize their name and username

**How to Test:**
1. Go to your **Profile** page
2. Edit **"Full Name"** field
3. Edit **"Username"** field (must be unique)
4. Click **"Update Profile"**
5. Changes should save
6. Verify username appears in User Management

---

## 📧 **6. NEWSLETTER**

### Newsletter Signup (For Logged-In Users)
**What Changed:** Conditional newsletter form on homepage

**How to Test:**
1. Log in as a **non-subscribed user**
2. Go to homepage
3. Scroll down below hero section
4. Should see **"Newsletter"** signup form
5. Fill in email and click **"Subscribe"**
6. **"Thank You"** modal should appear
7. Close modal
8. Newsletter section should **disappear**
9. Log out and back in → section should still be hidden

### Newsletter Signup (During Registration)
**What Changed:** Checkbox during signup

**How to Test:**
1. Log out
2. Go to **Sign Up** page
3. Look for checkbox: *"Sign up for our newsletter..."*
4. Check the box
5. Complete signup
6. After login, newsletter section should **NOT** appear on homepage

### Unauthenticated User View
**What Changed:** Different prompt for non-logged-in users

**How to Test:**
1. Log out completely
2. Go to homepage
3. Scroll below hero section
4. Should see **BLUE** box saying **"Sign up today"**
5. Text should be visible (white/light gray)
6. Should have **shimmer/glow animation**

---

## 👥 **7. USER MANAGEMENT** *(Super Admins Only)*

### View User Information
**What Changed:** More detailed user info display

**How to Test:**
1. Go to **Admin Center → Users**
2. Verify columns display:
   - Profile picture (avatar)
   - Full Name
   - **Username**
   - Email
   - Role (Admin/Super Admin/User)
   - **Newsletter Status** (✓ Subscribed / ✗ Not Subscribed)

### User Actions Dropdown
**What Changed:** Dropdown menu for user management

**How to Test:**
1. Click **"Actions"** dropdown for any user
2. Options should include:
   - **Grant/Revoke Newsletter**
   - **Make Admin / Remove Admin**
   - **Make Super Admin / Remove Super Admin**
   - **Edit Profile**
   - **Remove User**

### Edit User Profile
**What Changed:** Super Admins can edit other users

**How to Test:**
1. Click **Actions → Edit Profile**
2. Modal should open with:
   - Upload new profile picture
   - Edit full name
   - Edit username (must be unique)
3. Make changes and save
4. Verify changes appear in user list

### Remove User
**What Changed:** Ability to delete users

**How to Test:**
1. Create a test user account (or use existing)
2. Click **Actions → Remove User**
3. Confirm deletion
4. User should disappear from list
5. Verify user cannot log in

---

## 🎯 **8. AD MANAGER** *(Super Admins Only)*

### Access Ad Manager
**How to Test:**
1. Go to **Admin Center → Ad Manager**
2. Should see split-screen interface:
   - **Left:** Ad creation form
   - **Right:** Live website preview

### Upload & Create Ad
**What Changed:** Full ad management system

**How to Test:**
1. Click **"Create New Ad"**
2. Fill in fields:
   - **Title:** "Test Banner Ad"
   - **Image:** Upload an image (recommended sizes shown)
   - **Link URL:** https://example.com
   - **Start Date/Time:** Current date + 1 minute
   - **End Date/Time:** Current date + 1 hour
   - **Display Order:** 1

### Assign Ad to Slot
**How to Test:**
1. In the **preview (right side)**, click an ad slot
2. Numbered sections should be visible
3. Or select from **"Select Ad Slot"** dropdown
4. Check **"Fill section with image"** (recommended)
5. Click **"Save Ad"**

### Verify Ad Displays
**How to Test:**
1. Wait for start time to pass
2. Go to homepage (logged out view for best test)
3. Ad should appear in selected slot
4. Click ad → should open link in new tab
5. Go back to **Ad Manager**
6. Ad status should show **"Active"**

### Ad Rotation (Multiple Ads)
**How to Test:**
1. Create 2-3 ads for the **same slot**
2. Set **Runtime** (e.g., 10 seconds each)
3. Set different **Display Order** (1, 2, 3)
4. Save all ads
5. Go to that ad slot on site
6. Ads should **rotate** every 10 seconds in order

### Homepage Ad Sections
**What Changed:** 8 numbered ad sections on homepage

**How to Test:**
1. As admin, view homepage
2. Should see **numbered labels** on ad sections:
   - Section 1: Below hero
   - Section 2: Sidebar top (static, box-shaped)
   - Section 3-8: Various positions
3. Try adding ads to different sections
4. Verify they display correctly

### Article Page Ads
**What Changed:** Multiple ad placements in articles

**How to Test:**
1. Open any article
2. Look for ads in:
   - **Right sidebar top** (static, tall)
   - **Below recommended stories** (sticky, scrolls with page)
   - **Inline ads** within article content
3. Add ads to these slots in Ad Manager
4. Verify they display at correct size and position

### Disable/Enable Ads
**How to Test:**
1. Find an active ad
2. Toggle **"Enabled"** switch to OFF
3. Save
4. Ad should disappear from site
5. Toggle back to ON
6. Ad should reappear

---

## 📊 **9. ARTICLE PLACEMENTS** *(Admins & Super Admins)*

### Editor's Picks
**What Changed:** Manually curate featured articles

**How to Test:**
1. Go to **Admin Center → Manage Articles**
2. Click **"Article Placements"** tab
3. Under **"Editor's Picks"**:
   - Use dropdowns to select up to 3 articles
   - Click **"Save Editor's Picks"**
4. Go to homepage
5. Check right sidebar → **"Editor's Picks"** should show selected articles
6. Click **"Remove"** to clear a pick

### Most Read Management
**What Changed:** View and manage top articles

**How to Test:**
1. In **"Article Placements"** tab
2. Scroll to **"Most Read Articles"**
3. Should show top 5 articles by view count
4. Click **"Hide"** next to an article
5. Go to homepage
6. That article should not appear in "Most Read" section
7. Next-ranked article should take its place

---

## 🔍 **10. SECTION PAGES**

### Navigate to Section
**How to Test:**
1. Click any navigation category (e.g., "Spring City")
2. Should show all articles in that section
3. Articles should be relevant to that category

### Filters (For Governance Sections)
**What Changed:** Filter options for local topics

**How to Test:**
1. Go to **"Politics"** section
2. Look for filter buttons/dropdown:
   - Town Council
   - Town Decisions
   - Board of Education
   - Other governance topics
3. Select a filter
4. Articles should filter accordingly

---

## ✅ **FINAL CHECKS**

### Mobile Responsiveness
**How to Test:**
1. Open site on **mobile phone**
2. Test:
   - Hamburger menu works
   - Articles are readable
   - Ads display properly (stacked, not side-by-side)
   - Admin dashboard is usable
   - All buttons are clickable

### Cross-Browser Testing
**How to Test:**
1. Test on different browsers:
   - Chrome
   - Safari
   - Firefox
   - Edge
2. Verify all features work consistently

### Footer Update
**What Changed:** Removed "no banner ads" text

**How to Test:**
1. Scroll to bottom of any page
2. Should **NOT** see "No banner ads" text
3. Footer should be clean and accurate

---

## 🐛 **REPORTING ISSUES**

If you find any bugs or issues:

1. **Take a screenshot**
2. **Note the exact steps** to reproduce
3. **Browser and device** you're using
4. **Send to:** [Your contact method]

**Include:**
- What you expected to happen
- What actually happened
- Any error messages

---

## 🎉 **TESTING COMPLETE!**

Once you've tested all features:
- ✅ Check off each section
- 📝 Report any issues found
- 💬 Share feedback on user experience

**Thank you for helping test the new features!**

---

*Last Updated: December 24, 2025*
*Version: 2.0*

