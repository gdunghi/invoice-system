# 🔐 Production Configuration Reference

**Project:** Invoice System  
**Last Updated:** March 3, 2026

---

## 🌐 URLs

### Production (Vercel)
```
Frontend URL: https://we-account-17eytrer6-gdunghis-projects.vercel.app
Auth Callback: https://we-account-17eytrer6-gdunghis-projects.vercel.app/auth/callback
```

### Development (Local)
```
Frontend URL: http://localhost:3000
Auth Callback: http://localhost:3000/auth/callback
```

### Supabase
```
Project URL: https://lscnijpgqjouqivjsjzr.supabase.co
Auth Callback (Supabase): https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback
```

---

## 🔑 OAuth Configuration

### Google OAuth Client
```
Client ID: 141349537767-pldlh4h4ifrk7avv34v2s3n60t918cpj.apps.googleusercontent.com
```

### Authorized Redirect URIs (Google Cloud Console)
Must include BOTH:
```
1. https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback
2. http://localhost:3000/auth/callback
```

### Supabase Redirect URLs Configuration
Must include ALL:
```
1. http://localhost:3000/auth/callback (Development)
2. https://we-account-17eytrer6-gdunghis-projects.vercel.app/auth/callback (Production)
```

---

## ✅ Checklist for New Deployments

When deploying to a new Vercel URL:

- [ ] Update Google Cloud Console → Credentials → Authorized redirect URIs
- [ ] Update Supabase Dashboard → Authentication → URL Configuration
- [ ] Test Google OAuth on production URL
- [ ] Test email/password login on production
- [ ] Verify redirect after login works

---

## 🚨 Common Issues

### Error: "requested path is invalid"
**Cause:** OAuth callback URL mismatch  
**Solution:** Ensure ALL these match:
1. Vercel deployment URL in Supabase URL Configuration
2. Google OAuth Client ID redirect URIs include Supabase callback
3. Login page uses correct redirect path

---

## 📋 Environment Variables

### Required in Vercel
```
NEXT_PUBLIC_SUPABASE_URL=https://lscnijpgqjouqivjsjzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_wiYifUo6IzDcdfiOVki1PA_t0h9JX8z
```

(Service role key should NOT be exposed in production)

---

## 🔄 Testing OAuth Flow

### Local Testing
```bash
npm run dev
# Visit: http://localhost:3000/login
# Click: Sign in with Google
# Should redirect to Google login → back to callback → dashboard
```

### Production Testing
```
Visit: https://we-account-17eytrer6-gdunghis-projects.vercel.app/login
Click: Sign in with Google
Should redirect to Google login → back to callback → dashboard
```

---

## 📞 Support

If you get "requested path is invalid":
1. Check Supabase URL Configuration
2. Check Google OAuth Client redirect URIs
3. Ensure Vercel URL is up to date
4. Clear cookies and try again

---

**Last Verified:** March 3, 2026  
**Status:** ✅ Production URL Configured

