# Profile Customization Setup Guide

## ✅ What Was Implemented

1. **Profile Picture Upload** - Users can upload or take a photo for their profile
2. **Editable Name** - Users can edit their full name
3. **Editable Username** - Users can set/edit username with uniqueness validation
4. **Profile Picture Display** - Shows uploaded avatar or initials fallback

---

## 🔧 SUPABASE SETUP REQUIRED

### **STEP 1: Run Database Migration** (2 minutes)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase-profile-avatar-migration.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see: "Profile avatar migration completed successfully!"

This will:
- Add `avatar_url` column to `user_profiles` table
- Add unique constraint on `username` (if no duplicates exist)
- Create index for better performance

---

### **STEP 2: Create Storage Bucket for Avatars** (5 minutes)

1. Go to **Storage** in the left sidebar of Supabase Dashboard
2. Click **New bucket**
3. Name it: `avatars`
4. Make it **Public** (so profile pictures can be viewed)
5. Click **Create bucket**

6. **Set up bucket policies:**
   
   **IMPORTANT:** When pasting SQL into the policy definition field, paste ONLY the SQL code itself (without the ```sql markdown formatting).
   
   **Option 1: Simple approach (Recommended)**
   
   **Policy 1: Authenticated users can upload/manage avatars**
   - Go to **Storage** → **Policies** → `avatars` bucket
   - Click **New Policy**
   - Choose **For full customization**
   - **Policy name:** Type: `Avatar access policy`
   - **Allowed operations:** Check ALL of these: SELECT, INSERT, UPDATE, DELETE
   - **Target roles:** Click the dropdown and select **authenticated**
   - **Policy definition:** In the code editor, type EXACTLY this (use single quotes, not double):
     ```
     bucket_id = 'avatars'
     ```
     **IMPORTANT:** Make sure you use single quotes `'` around avatars, NOT double quotes `"` and NOT double single quotes `''`
   - Click **Review** then **Save policy**
   
   **Policy 2: Public can view avatars**
   - Click **New Policy** again
   - Choose **For full customization**
   - **Policy name:** Type: `Public avatar read`
   - **Allowed operations:** Check ONLY **SELECT**
   - **Target roles:** Leave as default (public) or select **public** from dropdown
   - **Policy definition:** Type EXACTLY this (single quotes only):
     ```
     bucket_id = 'avatars'
     ```
   - Click **Review** then **Save policy**

   **Option 2: More restrictive (Users can only manage their own avatars)**
   - Go to **Storage** → **Policies** → `avatars` bucket
   - Click **New Policy**
   - Choose **For full customization**
   - Policy name: `Users can manage their own avatars`
   - Allowed operations: Select **SELECT, INSERT, UPDATE, DELETE**
   - Target roles: Select **authenticated**
   - Policy definition: Paste ONLY this SQL:
     ```
     bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
     ```
   - Click **Review** then **Save policy**
   
   - Add public read policy (same as Option 1 above)

---

## 🧪 How to Test

### Test 1: Upload Profile Picture
1. Go to http://localhost:3000/profile
2. Click the pencil icon on your profile picture
3. Click "Upload Photo"
4. Select an image file
5. Profile picture should update immediately

### Test 2: Take Photo (Mobile)
1. On mobile device, go to profile page
2. Click pencil icon
3. Click "Take Photo"
4. Camera should open
5. Take photo and it should upload

### Test 3: Edit Name
1. Go to profile page
2. Click "Edit" next to Full Name
3. Change your name
4. Click "Save"
5. Name should update

### Test 4: Edit Username
1. Go to profile page
2. Click "Edit" next to Username
3. Enter a username (letters, numbers, underscores only)
4. Click "Save"
5. If username is taken, you'll see an error
6. If available, username should update

### Test 5: Username Uniqueness
1. Create a username on one account
2. Try to use the same username on another account
3. Should show "This username is already taken" error

---

## 📝 Notes

- Profile pictures are stored in Supabase Storage in the `avatars` bucket
- Old avatars are automatically deleted when a new one is uploaded
- Usernames must be unique across all users
- Username format: letters, numbers, and underscores only (min 3 characters)
- If no profile picture is set, initials are displayed in a colored circle
- Profile pictures appear in the profile page and can be used elsewhere in the app

---

## 🐛 Troubleshooting

**Issue: "Failed to upload profile picture"**
- Check that the `avatars` bucket exists and is public
- Verify storage policies are set up correctly
- Check browser console for detailed error messages

**Issue: "This username is already taken" even when it's not**
- Run the database migration again
- Check if unique constraint was added successfully
- Verify there are no duplicate usernames in the database

**Issue: Profile picture not showing**
- Check that the bucket is set to **Public**
- Verify the public read policy is in place
- Check the `avatar_url` in the database to ensure it's a valid URL

