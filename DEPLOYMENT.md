# 🚀 Deployment & Production Setup Guide

**Project:** Invoice System  
**Status:** Production Ready  
**Last Updated:** March 3, 2026

---

## 📋 Quick Checklist for Deployment

### Before Deploying to Vercel

- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] Environment variables ready
- [ ] Google OAuth credentials configured

---

## 🚀 Vercel Deployment Steps

### 1. Push to Git
```bash
git add .
git commit -m "Production ready - [date]"
git push origin main
```

### 2. Deploy via Vercel
Option A: Automatic (via Git integration)
- Push to main branch → Vercel auto-deploys

Option B: Manual
```bash
vercel deploy --prod
```

### 3. Get Your Production URL
After deployment, you'll get a URL like:
```
https://we-account-17eytrer6-gdunghis-projects.vercel.app
```

---

## 🔐 Configure OAuth for Production

### Step 1: Add Vercel URL to Supabase

Go to [Supabase Dashboard](https://app.supabase.com):
1. Select your project
2. **Authentication** → **URL Configuration**
3. Add Redirect URL:
   ```
   https://we-account-17eytrer6-gdunghis-projects.vercel.app/auth/callback
   ```

### Step 2: Add Vercel URL to Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com):
1. **APIs & Services** → **Credentials**
2. Select your OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   ```
   https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback
   ```

### Step 3: Set Environment Variables in Vercel

In Vercel Dashboard → Project Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://lscnijpgqjouqivjsjzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_wiYifUo6IzDcdfiOVki1PA_t0h9JX8z
NEXT_PUBLIC_APP_URL = https://we-account-17eytrer6-gdunghis-projects.vercel.app
```

---

## ✅ Verify Production Setup

### Test Login Flow
```
1. Visit: https://your-vercel-url.vercel.app/login
2. Click "Sign in with Google"
3. Approve permissions
4. Should redirect to dashboard ✅
```

### Test Email/Password
```
1. Visit: https://your-vercel-url.vercel.app/login
2. Enter email and password
3. Should redirect to dashboard ✅
```

---

## 📊 Current Production URLs

**Frontend:**
```
https://we-account-17eytrer6-gdunghis-projects.vercel.app
```

**Auth Callback:**
```
https://we-account-17eytrer6-gdunghis-projects.vercel.app/auth/callback
```

**Supabase:**
```
https://lscnijpgqjouqivjsjzr.supabase.co
```

---

## 🛠️ Troubleshooting

### Error: "requested path is invalid"
```
Cause: OAuth callback URL mismatch
Fix: 
1. Check Supabase URL Configuration
2. Check Google OAuth redirect URIs
3. Ensure Vercel URL matches exactly
4. Clear browser cookies
5. Try again
```

### Error: "Invalid client"
```
Cause: Client ID or secret mismatch
Fix:
1. Verify Client ID in code matches Google Console
2. Verify Client Secret in Supabase matches Google
3. Regenerate credentials if needed
4. Update all configs
```

### Redirect not working
```
Cause: Redirect URL not in whitelist
Fix:
1. Add to Google OAuth Client redirect URIs
2. Add to Supabase URL Configuration
3. Wait a few minutes for changes to propagate
4. Clear browser cache
```

---

## 📝 Production Checklist

After deploying:

- [ ] Frontend loads at production URL
- [ ] Login page accessible
- [ ] Google OAuth works
- [ ] Email/password login works
- [ ] Dashboard loads
- [ ] Reports work
- [ ] Can create/view invoices
- [ ] Logout works
- [ ] Protected routes redirect to login

---

## 🔒 Production Security Notes

**Do NOT commit:**
```
❌ .env.local (local development only)
❌ Service role keys
❌ API credentials
```

**Use Vercel Environment Variables for:**
```
✅ Public API keys (NEXT_PUBLIC_*)
✅ URLs (NEXT_PUBLIC_SUPABASE_URL)
```

---

## 📞 Contact & Support

**Production Issues?**
- Check Supabase logs
- Check Vercel deployment logs
- Verify environment variables
- Test locally first

---

**Status:** ✅ Ready for Production  
**Date:** March 3, 2026  
**Verified By:** Production Configuration Document

