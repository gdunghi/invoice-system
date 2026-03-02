import { supabase } from './supabase'

/**
 * Authentication Helper Functions
 * Using Supabase Auth with Google OAuth support
 */

export interface AuthUser {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role?: string
}

// ============================================
// Email/Password Authentication
// ============================================

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

// ============================================
// Google OAuth
// ============================================

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) throw error
  return data
}

// ============================================
// Session Management
// ============================================

/**
 * Sign out current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Get user profile from users table
  const { data: profile } = await supabase
    .from('users')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return {
    id: user.id,
    email: user.email!,
    full_name: profile?.full_name || user.user_metadata?.full_name,
    avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
    role: profile?.role || 'viewer',
  }
}

/**
 * Get current session
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Refresh session
 */
export async function refreshSession() {
  const {
    data: { session },
    error,
  } = await supabase.auth.refreshSession()
  if (error) throw error
  return session
}

// ============================================
// Password Management
// ============================================

/**
 * Change password (requires current session)
 */
export async function changePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) throw error
  return data
}

/**
 * Request password reset email
 */
export async function requestPasswordReset(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })

  if (error) throw error
  return data
}

// ============================================
// User Profile Management
// ============================================

/**
 * Get user profile from users table
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

/**
 * Create or update user profile
 */
export async function upsertUserProfile(userId: string, profile: {
  email: string
  full_name?: string
  avatar_url?: string
  role?: string
}) {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: profile.role || 'viewer',
        is_active: true,
        email_verified: true,
        last_login_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================
// Authorization Helpers
// ============================================

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, allowedRoles: string[]): boolean {
  if (!user || !user.role) return false
  return allowedRoles.includes(user.role)
}

/**
 * Check if user can edit invoice
 */
export function canEditInvoice(user: AuthUser | null, invoiceStatus: string): boolean {
  if (!user) return false

  const role = user.role

  // Admin and Accountant can edit everything
  if (role === 'admin' || role === 'accountant') return true

  // Sales can only edit draft and sent invoices
  if (role === 'sales') {
    return invoiceStatus === 'draft' || invoiceStatus === 'sent'
  }

  // Viewer cannot edit
  return false
}

/**
 * Check if user can delete invoice
 */
export function canDeleteInvoice(user: AuthUser | null): boolean {
  if (!user) return false
  return user.role === 'admin' || user.role === 'accountant'
}

/**
 * Check if user can manage users
 */
export function canManageUsers(user: AuthUser | null): boolean {
  if (!user) return false
  return user.role === 'admin'
}

