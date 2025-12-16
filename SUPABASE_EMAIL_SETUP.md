# 📧 Supabase Email & Google Sign-In Setup Guide

## ✅ What I Just Built:

1. **Email Confirmation Flow**
   - Users sign up → See "Check your email" message
   - Click confirmation link in email → See "Email Confirmed!" page
   - Auto-redirect to homepage after 3 seconds
   
2. **Google Sign-In Button**
   - Added to both login and signup pages
   - Beautiful Google branding
   - Ready to use once you enable it

3. **Better UX**
   - No more auto-login after signup
   - Clear instructions at each step
   - Professional confirmation flow

---

## 🔧 SETUP REQUIRED (Do This in Supabase Dashboard):

### **STEP 1: Enable Google Sign-In** (5 minutes)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/xccfhbteiaxtbslcnbsm

2. Click **Authentication** → **Providers** in the left sidebar

3. Find **Google** in the list and click to expand it

4. Toggle **Enable Sign in with Google** to ON

5. You'll need to create Google OAuth credentials:
   
   **Option A: Quick Setup (Supabase handles it)**
   - Click "Use Supabase's Google OAuth App" 
   - This is fastest but uses Supabase branding
   
   **Option B: Your Own Google OAuth (Recommended)**
   - Go to: https://console.cloud.google.com/
   - Create a new project (or select existing)
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: **Web application**
   - Add authorized redirect URIs:
     ```
     https://xccfhbteiaxtbslcnbsm.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**
   - Paste them into Supabase

6. Click **Save**

7. **Test it:** Go to your site → Click "Log in" → Click "Continue with Google"

---

### **STEP 2: Customize Email Templates** (10 minutes)

By default, Supabase sends boring plain-text emails. Let's make them beautiful!

1. Go to: https://supabase.com/dashboard/project/xccfhbteiaxtbslcnbsm/auth/templates

2. You'll see several email templates:
   - **Confirm signup** ← This is the one users receive
   - Magic Link
   - Change Email Address
   - Reset Password

3. Click **"Confirm signup"**

4. Replace the default template with this beautiful one:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 3px solid #3391af;">
              <h1 style="margin: 0; color: #141414; font-size: 32px; font-weight: 900; letter-spacing: -0.5px;">
                Spring-Ford Press
              </h1>
              <p style="margin: 8px 0 0 0; color: #666666; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
                Neighborhood-First News
              </p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px 0; color: #141414; font-size: 24px; font-weight: 600;">
                Welcome to Spring-Ford Press! 👋
              </h2>
              
              <p style="margin: 0 0 20px 0; color: #545454; font-size: 16px; line-height: 1.6;">
                Thank you for creating an account! We're excited to have you join our community of informed neighbors.
              </p>
              
              <p style="margin: 0 0 30px 0; color: #545454; font-size: 16px; line-height: 1.6;">
                To complete your registration and access all content, please confirm your email address by clicking the button below:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="margin: 0 auto;">
                <tr>
                  <td style="border-radius: 50px; background-color: #3391af;">
                    <a href="{{ .ConfirmationURL }}" target="_blank" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 50px;">
                      Confirm Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 30px 0 0 0; color: #545454; font-size: 14px; line-height: 1.6;">
                This link will expire in 24 hours. If you didn't create an account with Spring-Ford Press, you can safely ignore this email.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f8f8f8; border-top: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #666666; font-size: 12px; line-height: 1.6;">
                <strong>Having trouble?</strong><br>
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; color: #3391af; font-size: 11px; word-break: break-all;">
                {{ .ConfirmationURL }}
              </p>
              
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
              
              <p style="margin: 0; color: #999999; font-size: 11px; text-align: center;">
                © 2024 Spring-Ford Press. All rights reserved.<br>
                Independent, neighborhood-first reporting. No banner ads.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

5. Click **Save**

6. **Test it:** Sign up with a new email and check your inbox - beautiful email! 📧

---

### **STEP 3: Configure Email Settings** (Optional but Recommended)

#### **Use Your Own Email Domain (Professional)**

Instead of emails coming from "noreply@mail.app.supabase.io", use your own domain like "noreply@springfordpress.com"

**How to set up:**

1. Go to: https://supabase.com/dashboard/project/xccfhbteiaxtbslcnbsm/settings/auth

2. Scroll to **SMTP Settings**

3. You have two options:

   **Option A: Use a service like SendGrid, Mailgun, or AWS SES (Recommended)**
   - Sign up for SendGrid (free tier: 100 emails/day)
   - Get your SMTP credentials
   - Enter them in Supabase:
     ```
     Host: smtp.sendgrid.net
     Port: 587
     User: apikey
     Password: [your SendGrid API key]
     Sender email: noreply@yourdomain.com
     Sender name: Spring-Ford Press
     ```

   **Option B: Use Gmail (Easy but limited)**
   - Enable 2FA on your Gmail account
   - Create an "App Password"
   - Enter:
     ```
     Host: smtp.gmail.com
     Port: 587
     User: your-email@gmail.com
     Password: [your app password]
     Sender email: your-email@gmail.com
     Sender name: Spring-Ford Press
     ```

4. Click **Save**

5. **Test:** Send a test email from the Supabase dashboard

---

### **STEP 4: Disable Email Confirmation (Development Only)**

If you want to test without checking email every time:

1. Go to: https://supabase.com/dashboard/project/xccfhbteiaxtbslcnbsm/settings/auth

2. Scroll to **Email Auth**

3. Toggle **Enable email confirmations** to OFF

4. Users can sign up and log in immediately (no email confirmation needed)

⚠️ **IMPORTANT:** Turn this back ON before going to production!

---

## 🎯 Testing Your New Setup:

### **Test Email Confirmation:**
1. Delete your account from `user_profiles` table (or use a different email)
2. Go to: http://localhost:3000
3. Click "Log in" → "Create Account"
4. Fill in the form and submit
5. See "Check Your Email!" message
6. Check your inbox (might be in spam!)
7. Click the confirmation link
8. See "Email Confirmed!" with countdown
9. Redirected to homepage
10. ✅ You're logged in!

### **Test Google Sign-In:**
1. Go to: http://localhost:3000
2. Click "Log in"
3. Click "Continue with Google"
4. Sign in with your Google account
5. ✅ Auto-logged in, redirected to homepage!

---

## 📊 Email Template Variables Available:

You can use these in your email templates:

- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .Token }}` - The confirmation token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email

---

## 🎨 Customize Other Email Templates:

Use the same design for:
- **Reset Password** - When users forget password
- **Magic Link** - Passwordless login
- **Change Email** - When users update email

Just replace the heading, button text, and content!

---

## ✅ Checklist:

- [ ] Enable Google Sign-In in Supabase
- [ ] Test Google Sign-In on your site
- [ ] Customize "Confirm Signup" email template
- [ ] Test email confirmation flow
- [ ] (Optional) Set up custom SMTP for your domain
- [ ] (Optional) Customize other email templates

---

## 🚀 Next Steps:

Once this is working:
1. You can safely delete test accounts from database
2. Invite real users to sign up
3. They'll get beautiful branded emails
4. Super smooth onboarding experience!

---

**Need help with any of these steps?** Let me know which part you're stuck on and I'll walk you through it!

