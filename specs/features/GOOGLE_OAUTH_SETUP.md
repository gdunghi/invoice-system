# 🚀 Google OAuth Quick Start Guide

## Overview
คู่มือสำหรับติดตั้ง Google OAuth authentication ในระบบ Invoice System โดยใช้ Supabase Auth

---

## ✅ Prerequisites

- Supabase project ที่ใช้งานอยู่
- Google Cloud Console account
- ระบบ Invoice System ติดตั้งเรียบร้อยแล้ว

---

## 📋 Step-by-Step Setup

### Step 1: Setup Google Cloud Console

#### 1.1 Create Google Cloud Project
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. คลิก **Select a project** → **New Project**
3. ตั้งชื่อ project: `Invoice System`
4. คลิก **Create**

#### 1.2 Enable Google+ API
1. ไปที่ **APIs & Services** → **Library**
2. ค้นหา **Google+ API**
3. คลิก **Enable**

#### 1.3 Create OAuth 2.0 Credentials
1. ไปที่ **APIs & Services** → **Credentials**
2. คลิก **Create Credentials** → **OAuth client ID**
3. Configure consent screen (ถ้ายังไม่ได้ทำ):
   - User Type: **External**
   - App name: **Invoice System**
   - User support email: your@email.com
   - Developer contact: your@email.com
   - คลิก **Save and Continue**
   - Scopes: ไม่ต้องเพิ่ม (ใช้ default)
   - Test users: เพิ่ม email ที่จะใช้ทดสอบ
   - คลิก **Save and Continue**

4. Create OAuth client ID:
   - Application type: **Web application**
   - Name: **Invoice System OAuth**
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - Authorized redirect URIs:
     ```
     https://[your-supabase-ref].supabase.co/auth/v1/callback
     ```
     *Note: หา Supabase ref ได้จาก Project Settings → API → Project URL*
   
5. คลิก **Create**
6. **Copy** Client ID และ Client Secret (เก็บไว้)

---

### Step 2: Configure Supabase

#### 2.1 Enable Google Provider
1. ไปที่ Supabase Dashboard → **Authentication** → **Providers**
2. หา **Google** ในรายการ
3. เปิด toggle เป็น **Enabled**
4. Paste ข้อมูลที่ copy มา:
   - **Client ID**: `your-client-id.apps.googleusercontent.com`
   - **Client Secret**: `your-client-secret`
5. คลิก **Save**

#### 2.2 Configure Redirect URLs
1. ไปที่ **Authentication** → **URL Configuration**
2. เพิ่ม Redirect URLs:
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```
3. คลิก **Save**

---

### Step 3: Update Code

#### 3.1 Create Auth Helper (ถ้ายังไม่มี)

```bash
# สร้างไฟล์
touch lib/auth.ts
```

```typescript
// lib/auth.ts
import { supabase } from './supabase'

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  })
  
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

#### 3.2 Create Callback Page

```bash
# สร้างโฟลเดอร์และไฟล์
mkdir -p app/auth/callback
touch app/auth/callback/page.tsx
```

```typescript
// app/auth/callback/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  
  useEffect(() => {
    handleCallback()
  }, [])
  
  async function handleCallback() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // ถ้าต้องการสร้าง user profile ในตาราง users
        const user = session.user
        
        // Check if profile exists
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()
        
        // Create profile if first time login
        if (!profile) {
          await supabase.from('users').insert({
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name,
            avatar_url: user.user_metadata?.avatar_url,
            role: 'viewer', // Default role
            is_active: true,
            email_verified: true,
          })
        }
        
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Callback error:', error)
      router.push('/login?error=callback_failed')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p>กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  )
}
```

#### 3.3 Add Google Button to Login Page

```typescript
// app/login/page.tsx
'use client'
import { useState } from 'react'
import { signInWithGoogle } from '@/lib/auth'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    
    try {
      await signInWithGoogle()
      // User will be redirected to Google
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-8">Invoice System</h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            'กำลังเชื่อมต่อ...'
          ) : (
            <>
              {/* Google Icon */}
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              เข้าสู่ระบบด้วย Google
            </>
          )}
        </button>
      </div>
    </div>
  )
}
```

---

### Step 4: Test

#### 4.1 Start Development Server
```bash
npm run dev
```

#### 4.2 Test Login Flow
1. เปิด http://localhost:3000/login
2. คลิกปุ่ม "เข้าสู่ระบบด้วย Google"
3. เลือก Google account
4. อนุญาตสิทธิ์
5. ควรถูก redirect กลับมาที่ /auth/callback
6. แล้ว redirect ไปที่ /dashboard

---

## 🔒 Security Considerations

### 1. Redirect URL Validation
Supabase จะตรวจสอบว่า redirect URL ที่ใช้ต้องอยู่ใน whitelist:
- Local: `http://localhost:3000/auth/callback`
- Production: `https://your-domain.com/auth/callback`

### 2. User Profile Creation
ตรวจสอบว่า role ที่ assign ให้ user ใหม่เป็น `viewer` (least privilege):
```typescript
role: 'viewer' // Not 'admin'
```

Admin สามารถเปลี่ยน role ได้ทีหลัง

### 3. Session Management
Supabase จัดการ JWT token อัตโนมัติ:
- Access token: อายุ 1 ชั่วโมง
- Refresh token: อายุ 30 วัน
- Auto-refresh เมื่อ access token หมดอายุ

---

## 🐛 Troubleshooting

### Error: "Invalid redirect URL"
**สาเหตุ:** URL ไม่อยู่ใน whitelist  
**แก้ไข:** เพิ่ม URL ใน Supabase Dashboard → Authentication → URL Configuration

### Error: "OAuth callback error"
**สาเหตุ:** Client ID/Secret ผิด  
**แก้ไข:** 
1. ตรวจสอบ credentials ใน Google Cloud Console
2. Copy ใหม่และ paste ใน Supabase
3. Save และลองใหม่

### Error: "Access blocked: Invoice System has not completed verification"
**สาเหตุ:** App อยู่ใน testing mode  
**แก้ไข:** 
- Development: เพิ่ม test users ใน Google Cloud Console
- Production: Submit app for verification

### User ไม่ถูกสร้างใน users table
**สาเหตุ:** ไม่มี code สร้าง profile  
**แก้ไข:** เพิ่ม code ใน callback page (ดูข้างบน)

---

## 📊 Database Trigger (Alternative)

ถ้าไม่อยากเขียน code ใน callback, ใช้ trigger:

```sql
-- supabase/migrations/auto_create_user_profile.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, role, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    'viewer',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    email_verified = EXCLUDED.email_verified;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

Run migration:
```bash
# ใน Supabase SQL Editor
-- Paste และ run SQL ข้างบน
```

---

## ✅ Checklist

- [ ] สร้าง Google Cloud project
- [ ] Enable Google+ API
- [ ] สร้าง OAuth credentials
- [ ] Configure redirect URLs
- [ ] Enable Google provider ใน Supabase
- [ ] Paste Client ID/Secret
- [ ] เพิ่ม callback URLs
- [ ] สร้างไฟล์ `lib/auth.ts`
- [ ] สร้าง `app/auth/callback/page.tsx`
- [ ] Update login page
- [ ] Test login flow
- [ ] (Optional) สร้าง database trigger

---

## 🚀 Next Steps

1. **เพิ่ม OAuth providers อื่นๆ:**
   - Microsoft
   - GitHub
   - Facebook

2. **Enhance security:**
   - เพิ่ม 2FA
   - Session timeout
   - IP whitelisting

3. **Improve UX:**
   - Remember last login method
   - Profile picture from Google
   - Auto-fill user info

---

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Google Provider](https://supabase.com/docs/guides/auth/social-login/auth-google)

---

**Last Updated:** March 2, 2026  
**Status:** ✅ Ready to use  
**Tested:** ✅ Working

