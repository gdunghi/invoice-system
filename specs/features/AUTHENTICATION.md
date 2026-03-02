# 🔐 Authentication & Authorization Feature

## Overview
ระบบ login/logout, การจัดการผู้ใช้, และการควบคุมสิทธิ์การเข้าถึง (RBAC - Role-Based Access Control)

---

## 🎯 Business Goals

### Primary Goals
1. ป้องกันการเข้าถึงข้อมูลโดยไม่ได้รับอนุญาต
2. แยกสิทธิ์ผู้ใช้ตามหน้าที่ (Admin, Accountant, Viewer)
3. รองรับหลายบริษัท (Multi-tenant)
4. Audit trail สำหรับการเปลี่ยนแปลงข้อมูลสำคัญ
5. รองรับ SSO (Single Sign-On) ในอนาคต

### Security Goals
- Protect sensitive invoice data
- Prevent unauthorized modifications
- Track user activities
- Comply with data protection regulations

---

## 👥 User Roles & Permissions

### Role Matrix

| Permission | Admin | Accountant | Sales | Viewer |
|-----------|-------|------------|-------|--------|
| View Dashboard | ✅ | ✅ | ✅ | ✅ |
| View Invoices | ✅ | ✅ | ✅ | ✅ |
| Create Invoices | ✅ | ✅ | ✅ | ❌ |
| Edit Invoices (Draft/Sent) | ✅ | ✅ | ✅ | ❌ |
| Edit Invoices (Paid) | ✅ | ✅ | ❌ | ❌ |
| Delete Invoices | ✅ | ✅ | ❌ | ❌ |
| Mark as Paid | ✅ | ✅ | ❌ | ❌ |
| Send Email | ✅ | ✅ | ✅ | ❌ |
| Export Reports | ✅ | ✅ | ✅ | ❌ |
| Manage Users | ✅ | ❌ | ❌ | ❌ |
| Manage Settings | ✅ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |

### Role Descriptions

#### 1. Admin (ผู้ดูแลระบบ)
- สิทธิ์เต็มทุกอย่าง
- จัดการผู้ใช้
- ตั้งค่าระบบ
- เข้าถึง audit logs

#### 2. Accountant (นักบัญชี)
- จัดการใบแจ้งหนี้ทั้งหมด
- แก้ไขได้แม้สถานะเป็น paid
- ดู reports และ export
- เข้าถึง audit logs

#### 3. Sales (ฝ่ายขาย)
- สร้างและแก้ไข invoices (draft/sent เท่านั้น)
- ส่ง email ให้ลูกค้า
- ดู reports
- ไม่สามารถ delete หรือแก้ไขใบแจ้งหนี้ที่ชำระแล้ว

#### 4. Viewer (ผู้อ่าน)
- ดูข้อมูลเท่านั้น
- ไม่สามารถแก้ไข/ลบ
- เหมาะสำหรับ management หรือ external auditors

---

## 🗄️ Database Schema

### New Tables

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- 'admin', 'accountant', 'sales', 'viewer'
  company_id UUID REFERENCES companies(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_role ON users(role);

-- Sessions table (for JWT tokens)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'view', 'send_email'
  resource_type VARCHAR(50) NOT NULL, -- 'invoice', 'customer', 'user', 'settings'
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- Companies table (for multi-tenant)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  logo_url TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update existing invoices table
ALTER TABLE invoices ADD COLUMN company_id UUID REFERENCES companies(id);
ALTER TABLE invoices ADD COLUMN created_by UUID REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN updated_by UUID REFERENCES users(id);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);

-- Update customers table
ALTER TABLE customers ADD COLUMN company_id UUID REFERENCES companies(id);
CREATE INDEX idx_customers_company ON customers(company_id);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users can view invoices in their company"
  ON invoices FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin and Accountant can do everything"
  ON invoices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = invoices.company_id
      AND role IN ('admin', 'accountant')
    )
  );

CREATE POLICY "Sales can create and update draft/sent invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = invoices.company_id
      AND role IN ('admin', 'accountant', 'sales')
    )
  );

CREATE POLICY "Sales can only update draft/sent"
  ON invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = invoices.company_id
      AND role = 'sales'
      AND status IN ('draft', 'sent')
    )
  );

-- Customers policies
CREATE POLICY "Users can view customers in their company"
  ON customers FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Non-viewers can manage customers"
  ON customers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = customers.company_id
      AND role IN ('admin', 'accountant', 'sales')
    )
  );

-- Users policies (can only see users in same company)
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() 
      AND u.company_id = users.company_id
      AND u.role = 'admin'
    )
  );
```

---

## 🔌 API Endpoints

### Authentication APIs

```typescript
// POST /api/auth/register
Request: {
  email: string
  password: string
  full_name: string
  company_name: string // For first user (creates company)
}
Response: {
  user: User
  token: string
  refresh_token: string
}

// POST /api/auth/login
Request: {
  email: string
  password: string
}
Response: {
  user: User
  token: string
  refresh_token: string
}

// POST /api/auth/logout
Headers: Authorization: Bearer {token}
Response: {
  success: boolean
}

// POST /api/auth/refresh
Request: {
  refresh_token: string
}
Response: {
  token: string
  refresh_token: string
}

// GET /api/auth/me
Headers: Authorization: Bearer {token}
Response: {
  user: User
}

// POST /api/auth/change-password
Request: {
  old_password: string
  new_password: string
}
Response: {
  success: boolean
}

// POST /api/auth/forgot-password
Request: {
  email: string
}
Response: {
  success: boolean
  message: string
}

// POST /api/auth/reset-password
Request: {
  token: string
  new_password: string
}
Response: {
  success: boolean
}
```

### User Management APIs

```typescript
// GET /api/users
// Admin only
Response: {
  users: User[]
}

// POST /api/users
// Admin only
Request: {
  email: string
  full_name: string
  role: 'admin' | 'accountant' | 'sales' | 'viewer'
  send_invitation: boolean
}
Response: {
  user: User
}

// PUT /api/users/:id
// Admin only
Request: {
  full_name?: string
  role?: string
  is_active?: boolean
}
Response: {
  user: User
}

// DELETE /api/users/:id
// Admin only
Response: {
  success: boolean
}

// GET /api/audit-logs
// Admin and Accountant only
Query: ?user_id=xxx&action=update&resource_type=invoice
Response: {
  logs: AuditLog[]
  pagination: { page, total }
}
```

---

## 📦 Implementation

### Phase 1: Authentication Setup (Week 1)

#### Option 1: Use Supabase Auth + Google OAuth ✅ Recommended
```bash
# Already included with Supabase!
# Just enable in Supabase Dashboard
```

#### Step 1.1: Enable Google OAuth in Supabase Dashboard

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Application type: Web application
6. Add authorized redirect URI:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
7. Copy **Client ID** and **Client Secret**
8. Go to Supabase Dashboard → Authentication → Providers
9. Enable **Google** provider
10. Paste Client ID and Client Secret
11. Save configuration

#### Step 1.2: Create Auth Helper Functions

```typescript
// lib/auth.ts
import { supabase } from './supabase'

// Email/Password Sign Up
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      }
    }
  })
  
  if (error) throw error
  return data
}

// Email/Password Sign In
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

// Google OAuth Sign In
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

// Sign Out
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Get Current User
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Get User Profile (from users table)
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}
```

#### Option 2: Custom JWT Implementation
```bash
npm install jsonwebtoken bcrypt
```

```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

const JWT_SECRET = process.env.JWT_SECRET!

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

export function verifyToken(token: string): { userId: string; role: string } {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch {
    throw new Error('Invalid token')
  }
}
```

### Phase 2: Authorization Middleware (Week 1)

```typescript
// lib/middleware/auth.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function requireAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    )
  }
  
  return user
}

export async function requireRole(req: NextRequest, allowedRoles: string[]) {
  const user = await requireAuth(req)
  if (user instanceof NextResponse) return user // Error response
  
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile || !allowedRoles.includes(profile.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }
  
  return { user, profile }
}
```

### Phase 3: UI Components (Week 2)

#### 3.1 Login Page (with Google OAuth)

```typescript
// app/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn, signInWithGoogle } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const { user, session } = await signIn(email, password)
      
      // Store session
      localStorage.setItem('token', session.access_token)
      
      // Redirect to dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  
  async function handleGoogleSignIn() {
    setError('')
    setGoogleLoading(true)
    
    try {
      await signInWithGoogle()
      // Supabase will redirect to Google OAuth page
      // After success, user will be redirected to /auth/callback
    } catch (err: any) {
      setError(err.message)
      setGoogleLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoice System</h1>
          <p className="text-gray-600 mt-2">เข้าสู่ระบบ</p>
        </div>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}
        
        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={googleLoading || loading}
          className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 mb-6"
        >
          {googleLoading ? (
            'กำลังเชื่อมต่อ...'
          ) : (
            <>
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
        
        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">หรือ</span>
          </div>
        </div>
        
        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Email'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <a href="/forgot-password" className="text-purple-600 hover:underline">
            ลืมรหัสผ่าน?
          </a>
        </div>
      </div>
    </div>
  )
}
```

#### 3.2 OAuth Callback Page

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
      // Get session from URL hash
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=callback_failed')
        return
      }
      
      if (session) {
        const user = session.user
        
        // Check if user profile exists
        const { data: profile } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single()
        
        // Create profile if doesn't exist (first time Google login)
        if (!profile) {
          const fullName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.email?.split('@')[0]
          
          await supabase.from('users').insert({
            id: user.id,
            email: user.email!,
            full_name: fullName,
            role: 'viewer', // Default role, admin can change later
            avatar_url: user.user_metadata?.avatar_url,
            is_active: true,
            email_verified: true,
          })
        }
        
        // Update last login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id)
        
        // Redirect to dashboard
        router.push('/dashboard')
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Callback error:', error)
      router.push('/login?error=unknown')
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังเข้าสู่ระบบ...</p>
      </div>
    </div>
  )
}
```

#### 3.3 Update Database Trigger for OAuth Users

```sql
-- supabase/migrations/add_oauth_user_sync.sql

-- Function to auto-create user profile when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email_confirmed_at IS NOT NULL
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 3.4 Protected Route HOC

```typescript
// components/withAuth.tsx
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'

export function withAuth(Component: any, allowedRoles?: string[]) {
  return function ProtectedRoute(props: any) {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    
    useEffect(() => {
      checkAuth()
    }, [])
    
    async function checkAuth() {
      try {
        const currentUser = await getCurrentUser()
        
        if (!currentUser) {
          router.push('/login')
          return
        }
        
        // Check role if specified
        if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
          router.push('/unauthorized')
          return
        }
        
        setUser(currentUser)
      } catch (error) {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    
    if (loading) {
      return <div>Loading...</div>
    }
    
    if (!user) {
      return null
    }
    
    return <Component {...props} user={user} />
  }
}
```

#### 3.3 User Management Page

```typescript
// app/admin/users/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { withAuth } from '@/components/withAuth'

function UsersPage() {
  const [users, setUsers] = useState([])
  
  useEffect(() => {
    loadUsers()
  }, [])
  
  async function loadUsers() {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data.users)
  }
  
  async function handleCreateUser() {
    const email = prompt('Email:')
    const fullName = prompt('Full Name:')
    const role = prompt('Role (admin/accountant/sales/viewer):')
    
    await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ email, full_name: fullName, role })
    })
    
    loadUsers()
  }
  
  async function handleToggleActive(userId: string, isActive: boolean) {
    await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: !isActive })
    })
    
    loadUsers()
  }
  
  return (
    <div className="container mx-auto p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <button
          onClick={handleCreateUser}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg"
        >
          Add User
        </button>
      </div>
      
      <table className="w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">Name</th>
            <th className="px-6 py-3 text-left">Email</th>
            <th className="px-6 py-3 text-left">Role</th>
            <th className="px-6 py-3 text-left">Status</th>
            <th className="px-6 py-3 text-left">Last Login</th>
            <th className="px-6 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user: any) => (
            <tr key={user.id} className="border-t">
              <td className="px-6 py-4">{user.full_name}</td>
              <td className="px-6 py-4">{user.email}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-xs ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4">
                {user.is_active ? '✅ Active' : '❌ Inactive'}
              </td>
              <td className="px-6 py-4">{user.last_login_at || '-'}</td>
              <td className="px-6 py-4">
                <button
                  onClick={() => handleToggleActive(user.id, user.is_active)}
                  className="text-blue-600 hover:underline"
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'admin': return 'bg-purple-100 text-purple-800'
    case 'accountant': return 'bg-blue-100 text-blue-800'
    case 'sales': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default withAuth(UsersPage, ['admin'])
```

### Phase 4: Audit Logging (Week 3)

```typescript
// lib/audit.ts
import { supabase } from './supabase'

export async function logAudit(params: {
  userId: string
  action: 'create' | 'update' | 'delete' | 'view' | 'send_email'
  resourceType: 'invoice' | 'customer' | 'user' | 'settings'
  resourceId?: string
  oldValues?: any
  newValues?: any
  ipAddress?: string
  userAgent?: string
}) {
  await supabase.from('audit_logs').insert({
    user_id: params.userId,
    action: params.action,
    resource_type: params.resourceType,
    resource_id: params.resourceId,
    old_values: params.oldValues,
    new_values: params.newValues,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
  })
}

// Usage in API routes
import { logAudit } from '@/lib/audit'

// In updateInvoice API
const oldInvoice = await getInvoiceById(id)
const newInvoice = await updateInvoice(id, data)

await logAudit({
  userId: currentUser.id,
  action: 'update',
  resourceType: 'invoice',
  resourceId: id,
  oldValues: oldInvoice,
  newValues: newInvoice,
  ipAddress: req.headers.get('x-forwarded-for'),
  userAgent: req.headers.get('user-agent'),
})
```

---

## 🧪 Testing

```typescript
// tests/features/auth.test.ts
describe('Authentication', () => {
  it('should login with valid credentials', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password123'
      })
    })
    
    const data = await res.json()
    expect(data.token).toBeDefined()
    expect(data.user.email).toBe('admin@example.com')
  })
  
  it('should reject invalid credentials', async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'wrongpassword'
      })
    })
    
    expect(res.status).toBe(401)
  })
})

describe('Authorization', () => {
  it('should allow admin to manage users', async () => {
    const res = await fetch('/api/users', {
      headers: { authorization: `Bearer ${adminToken}` }
    })
    
    expect(res.status).toBe(200)
  })
  
  it('should forbid viewer from creating invoices', async () => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { authorization: `Bearer ${viewerToken}` },
      body: JSON.stringify({ ... })
    })
    
    expect(res.status).toBe(403)
  })
})
```

---

## 📊 Success Metrics

### Technical KPIs
- Login success rate > 99%
- Token refresh success rate > 99%
- Authorization check time < 50ms
- Zero unauthorized access incidents

### Business KPIs
- User adoption rate
- Active users per day
- Failed login attempts
- Audit log coverage

---

## 🚀 Future Enhancements

### Phase 5: Advanced Features
- [x] OAuth integration (Google) ✅
- [ ] Additional OAuth providers:
  - [ ] Microsoft/Azure AD
  - [ ] GitHub
  - [ ] Facebook
  - [ ] Apple Sign In
- [ ] Two-factor authentication (2FA)
- [ ] Single Sign-On (SSO) via SAML
- [ ] API keys for external integrations
- [ ] IP whitelisting
- [ ] Session management (force logout)
- [ ] Password policies (complexity, expiry)
- [ ] Brute force protection
- [ ] Activity monitoring dashboard
- [ ] Role templates
- [ ] Custom permissions per user
- [ ] Data export requests (GDPR)

### Adding More OAuth Providers

Supabase Auth supports many providers out of the box:

**Social Logins:**
- Google ✅ (Implemented)
- Microsoft
- GitHub
- Facebook
- Twitter
- Discord
- Slack
- Spotify
- Apple

**Enterprise:**
- Azure AD
- Okta
- Auth0
- OneLogin

**Implementation is similar:**
```typescript
// lib/auth.ts
export async function signInWithMicrosoft() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: 'email profile openid'
    }
  })
  
  if (error) throw error
  return data
}

export async function signInWithGitHub() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    }
  })
  
  if (error) throw error
  return data
}
```

**UI Update:**
```typescript
// app/login/page.tsx
<div className="space-y-3">
  <button onClick={handleGoogleSignIn}>
    <GoogleIcon /> เข้าสู่ระบบด้วย Google
  </button>
  
  <button onClick={handleMicrosoftSignIn}>
    <MicrosoftIcon /> เข้าสู่ระบบด้วย Microsoft
  </button>
  
  <button onClick={handleGitHubSignIn}>
    <GitHubIcon /> เข้าสู่ระบบด้วย GitHub
  </button>
</div>
```

---

**Last Updated:** March 2, 2026  
**Status:** 📝 Planning  
**Priority:** High  
**Estimated Effort:** 3-4 weeks  
**Security:** ⚠️ ต้อง penetration testing ก่อน production

