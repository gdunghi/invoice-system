# 🚀 Authentication Setup Guide

## Quick Start

สำหรับการ setup Authentication feature ให้ทำตามขั้นตอนด้านล่าง

---

## Step 1: Run Database Migration

### 1.1 เข้าสู่ Supabase SQL Editor
1. ไปที่ [Supabase Dashboard](https://app.supabase.com/)
2. เลือก project ของคุณ
3. คลิก **SQL Editor** ในเมนูด้านซ้าย

### 1.2 Run Migration
1. เปิดไฟล์ `supabase/migrations/add_authentication.sql`
2. Copy SQL ทั้งหมด
3. Paste ใน SQL Editor
4. คลิก **Run** หรือ `Ctrl+Enter`

### 1.3 Verify Tables Created
```sql
-- ตรวจสอบว่าตารางถูกสร้างแล้ว
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'companies', 'audit_logs');
```

ควรเห็น 3 tables: `users`, `companies`, `audit_logs`

---

## Step 2: Configure Environment Variables

### 2.1 Copy .env.example
```bash
cp .env.example .env.local
```

### 2.2 Get Supabase Credentials
1. ไปที่ Supabase Dashboard → Project Settings → API
2. Copy ค่าต่อไปนี้:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2.3 Update .env.local
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Step 3: Setup Google OAuth (Optional)

ถ้าต้องการ Google Sign-In ให้ทำตามขั้นตอนใน:
👉 **`specs/features/GOOGLE_OAUTH_SETUP.md`**

### Quick Steps:
1. สร้าง OAuth credentials ใน Google Cloud Console
2. Enable Google provider ใน Supabase Dashboard → Authentication → Providers
3. Paste Client ID และ Client Secret
4. เพิ่ม redirect URL: `https://[your-project].supabase.co/auth/v1/callback`

---

## Step 4: Install Dependencies (ถ้ายังไม่ได้ทำ)

```bash
npm install
```

---

## Step 5: Start Development Server

```bash
npm run dev
```

เปิด http://localhost:3000/login

---

## Step 6: Test Authentication

### 6.1 Test Email/Password Sign Up

1. สร้าง user ผ่าน Supabase Dashboard:
   - Authentication → Users → Add user
   - Email: `admin@test.com`
   - Password: `admin123456`
   - Auto Confirm User: ✅

2. หรือ sign up through API:
```typescript
import { signUp } from '@/lib/auth'

await signUp('user@example.com', 'password123', 'John Doe')
```

### 6.2 Test Login

1. ไปที่ http://localhost:3000/login
2. กรอก email/password
3. คลิก "เข้าสู่ระบบด้วย Email"
4. ควรถูก redirect ไปหน้าหลัก

### 6.3 Test Google OAuth (ถ้า setup แล้ว)

1. คลิก "เข้าสู่ระบบด้วย Google"
2. เลือก Google account
3. Approve permissions
4. ควร redirect กลับมาที่ /auth/callback
5. แล้ว redirect ไปหน้าหลัก

---

## Step 7: Assign User Roles

### 7.1 ผ่าน SQL
```sql
-- Update user role to admin
UPDATE users 
SET role = 'admin' 
WHERE email = 'admin@test.com';

-- Check current roles
SELECT id, email, role FROM users;
```

### 7.2 ผ่าน Supabase Dashboard
1. Database → Tables → users
2. หา user ที่ต้องการ
3. แก้ไข column `role`
4. เลือก: `admin`, `accountant`, `sales`, หรือ `viewer`

---

## Troubleshooting

### ❌ "relation 'users' does not exist"
**แก้ไข:** Run migration ใน Step 1 อีกครั้ง

### ❌ "Invalid login credentials"
**แก้ไข:** 
- ตรวจสอบ email/password
- ตรวจสอบว่า user มีอยู่ใน `auth.users` table
- ลอง reset password ใน Supabase Dashboard

### ❌ "OAuth callback error"
**แก้ไข:**
- ตรวจสอบ redirect URL ใน Google Cloud Console
- ตรวจสอบว่า Google provider enabled ใน Supabase
- ตรวจสอบ Client ID/Secret ถูกต้อง

### ❌ "User profile not created"
**แก้ไข:**
- ตรวจสอบว่า trigger `on_auth_user_created` ทำงาน:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```
- ถ้าไม่มี ให้ run migration อีกครั้ง

### ❌ "RLS policy error"
**แก้ไข:**
- Disable RLS ชั่วคราวเพื่อทดสอบ:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```
- หลังแก้ไขแล้วให้ enable กลับ:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

## Next Steps

### 1. Protect Routes
ต้องการให้บางหน้าเข้าถึงได้เฉพาะ logged-in users:

```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return <div>Welcome {user.full_name}!</div>
}
```

### 2. Role-Based Access
ต้องการให้เฉพาะ admin เข้าถึง:

```typescript
import { hasRole } from '@/lib/auth'

const user = await getCurrentUser()

if (!hasRole(user, ['admin'])) {
  return <div>Access Denied</div>
}
```

### 3. Add User Menu
เพิ่ม user menu ที่ header:

```typescript
// components/UserMenu.tsx
import { useAuth } from '@/lib/auth-context'

export function UserMenu() {
  const { user, signOut } = useAuth()
  
  if (!user) return null
  
  return (
    <div>
      <img src={user.avatar_url} alt={user.full_name} />
      <span>{user.full_name}</span>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### 4. Add Audit Logging
บันทึกการกระทำของ user:

```sql
-- Log when invoice is created
SELECT log_audit(
  auth.uid(),              -- user_id
  'create',                -- action
  'invoice',               -- resource_type
  'invoice-id-here',       -- resource_id
  NULL,                    -- old_values
  '{"total": 1000}'::jsonb -- new_values
);
```

---

## Testing Checklist

- [ ] Database migration สำเร็จ
- [ ] Environment variables ตั้งค่าแล้ว
- [ ] สามารถ sign up ด้วย email/password
- [ ] สามารถ login ด้วย email/password
- [ ] (Optional) สามารถ login ด้วย Google
- [ ] User profile ถูกสร้างใน `users` table
- [ ] User มี default role = `viewer`
- [ ] สามารถ sign out ได้
- [ ] RLS policies ทำงานถูกต้อง

---

## Security Checklist (Before Production)

- [ ] เปลี่ยน default passwords
- [ ] Enable email confirmation
- [ ] Configure password policies
- [ ] Setup rate limiting
- [ ] Enable 2FA (ในอนาคต)
- [ ] Review RLS policies
- [ ] Test audit logging
- [ ] Setup monitoring/alerts

---

## Resources

- **Auth Functions:** `lib/auth.ts`
- **Login Page:** `app/login/page.tsx`
- **OAuth Callback:** `app/auth/callback/page.tsx`
- **Migration SQL:** `supabase/migrations/add_authentication.sql`
- **Google OAuth Guide:** `specs/features/GOOGLE_OAUTH_SETUP.md`
- **Full Spec:** `specs/features/AUTHENTICATION.md`

---

**Need Help?**
- Check `specs/features/AUTHENTICATION.md` for full details
- See `specs/features/GOOGLE_OAUTH_SETUP.md` for Google OAuth
- Review Supabase Auth docs: https://supabase.com/docs/guides/auth

---

✅ Authentication setup complete!

