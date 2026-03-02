# 🔧 Google OAuth Fix Action Plan

**Issue:** "Unable to exchange external code" when trying to sign in with Google  
**Root Cause:** Redirect URI mismatch or credentials misconfiguration  
**Status:** Ready to fix (needs key rotation)

---

## ⚠️ CRITICAL: Rotate Keys First

**Your secrets were exposed in scratch file. MUST ROTATE IMMEDIATELY:**

```
Old SUPABASE_SERVICE_ROLE_KEY: 
Old GOOGLE_CLIENT_SECRET:
```

### Step 1: Rotate Supabase Keys

1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Go to **Project Settings** → **API**
3. Click **Regenerate** next to `anon public key`
   - Copy new key
   - Save to secure location
4. Click **Regenerate** next to `service_role key`
   - Copy new key
   - Save to secure location
5. Update local `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_ANON_KEY=new-key-here
   SUPABASE_SERVICE_ROLE_KEY=new-key-here
   ```

### Step 2: Rotate Google Client Secret

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **APIs & Services** → **Credentials**
3. Find your OAuth 2.0 Client ID for "Web application"
4. Click **Reset Secret**
   - Confirm (old secret will be invalidated)
   - Copy new secret
5. Update local `.env.local`:
   ```
   GOOGLE_CLIENT_SECRET=new-secret-here
   ```

### Step 3: Update Supabase with New Google Secret

1. Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste new **Client Secret** (from step above)
3. Click **Save**

---

## ✅ Fix Google OAuth Exchange Error

### Step 4: Verify Redirect URIs in Google Console

1. Google Cloud → **APIs & Services** → **Credentials**
2. Click on your OAuth client ID (Web application)
3. Under **Authorized redirect URIs**, ensure it includes:
   ```
   https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback
   ```
   
   ⚠️ **This is critical!** If missing, add it:
   - Click **Edit**
   - Add new URI: `https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback`
   - Click **Save**

### Step 5: Verify Supabase URL Config

1. Supabase → **Authentication** → **URL Configuration**
2. Verify these are set:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:**
     - `http://localhost:3000/auth/callback`
     - `https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback`
3. If missing, add them and click **Save**

### Step 6: Check OAuth Consent Screen

1. Google Cloud → **OAuth consent screen**
2. Verify:
   - ✅ **User Type:** External
   - ✅ **App name:** Invoice System (or your choice)
   - ✅ **User support email:** your@email.com
   - ✅ **Developer contact:** your@email.com
   - ✅ **Test users:** Add your email (important!)

If app is still in "Testing" mode, only test users can sign in.

---

## 🧪 Test Google OAuth

### Step 7: Start Dev Server and Test

```bash
# 1. Make sure .env.local has new keys
cat .env.local | grep GOOGLE

# 2. Start server
npm run dev

# 3. Open login page
# http://localhost:3000/login

# 4. Click "Sign In with Google"
```

### Expected Flow:
1. Redirect to Google login page
2. Select/login with Google account
3. See permission request (email, profile, etc.)
4. Click **Allow**
5. Redirect to `http://localhost:3000/auth/callback`
6. Loading spinner appears
7. Redirect to dashboard (if successful)

### If Error Still Occurs:
Check Supabase logs:
1. Supabase → **Logs** → **Auth**
2. Look for error message
3. Common errors:
   - `invalid_client` → Client Secret wrong
   - `redirect_uri_mismatch` → Missing redirect URI
   - `invalid_grant` → Code already used or expired

---

## 📋 Checklist

- [ ] Old secrets rotated (Supabase + Google)
- [ ] New keys in `.env.local`
- [ ] Google Console has redirect URI: `https://lscnijpgqjouqivjsjzr.supabase.co/auth/v1/callback`
- [ ] Supabase Provider → Google has new Client Secret
- [ ] Supabase URL Config has redirect URLs
- [ ] OAuth Consent Screen fully configured
- [ ] Test user email added to Google Console
- [ ] Dev server running with `npm run dev`
- [ ] Login page accessible at http://localhost:3000/login
- [ ] Can click Google sign-in button
- [ ] Redirect to Google login works
- [ ] Can approve permissions
- [ ] Redirect back to callback works
- [ ] Auto user creation happens
- [ ] Redirect to dashboard succeeds

---

## 🔒 Security Notes

### What NOT to do:
- ❌ Don't share `.env.local` in chat/email
- ❌ Don't commit `.env.local` to git
- ❌ Don't paste secrets in public gists
- ❌ Don't leave old secrets in use

### Best practices:
- ✅ Rotate keys when exposed
- ✅ Use unique secrets per environment (dev/staging/prod)
- ✅ Store secrets only in `.env.local` (git-ignored)
- ✅ Use service accounts for server-to-server auth

---

## 📞 If Still Stuck

### Debug Steps:
1. Check Supabase Auth logs for exact error
2. Verify all 3 things match:
   - Google Client ID
   - Google Client Secret
   - Redirect URIs
3. Try in incognito mode (clear cookies)
4. Check `.env.local` has no typos

### Common Mistakes:
- ❌ Redirect URI missing `https://`
- ❌ Redirect URI missing `/auth/v1/callback` exact path
- ❌ Using old Client Secret after regeneration
- ❌ Not updating Supabase after regenerating Google secret
- ❌ Test user not added when app in Testing mode

---

## ✅ When It Works

After successful Google sign-in:
1. User redirected to `/auth/callback`
2. New user profile created in `users` table
3. Default role: `viewer`
4. Redirect to dashboard (or home page)
5. Session cookie set
6. Can navigate protected pages

---

**Next:** Follow this checklist step-by-step. Google OAuth should work! ✅

