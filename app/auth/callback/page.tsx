'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { upsertUserProfile } from '@/lib/auth'

// This page uses client-side features only
export const dynamic = 'force-dynamic'

function AuthCallbackContent() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      // Check for error in URL (from OAuth provider)
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      const errorDescription = params.get('error_description')

      if (error) {
        throw new Error(errorDescription || error)
      }

      // Get session from URL hash or storage
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError) throw sessionError

      if (!session) {
        throw new Error('No session found')
      }

      const user = session.user

      // Check if user profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('users')
        .select('id, role, company_id')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create it (first time login via OAuth)
      if (!existingProfile || profileError) {
        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          'User'

        await upsertUserProfile(user.id, {
          email: user.email!,
          full_name: fullName,
          avatar_url: user.user_metadata?.avatar_url,
          role: 'viewer', // Default role
        })

        console.log('Created new user profile for:', user.email)
      } else {
        // Update last login
        await supabase
          .from('users')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id)
      }

      setStatus('success')

      // Wait a moment before redirecting
      setTimeout(() => {
        router.push('/')
        router.refresh()
      }, 500)
    } catch (error: any) {
      console.error('Auth callback error:', error)
      setStatus('error')
      setErrorMessage(error.message || 'Authentication failed')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?error=callback_failed')
      }, 3000)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          <p className="mt-6 text-gray-700 font-medium text-lg">กำลังเข้าสู่ระบบ...</p>
          <p className="mt-2 text-gray-500 text-sm">กรุณารอสักครู่</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="bg-green-100 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-700 font-medium text-lg">เข้าสู่ระบบสำเร็จ!</p>
          <p className="mt-2 text-gray-500 text-sm">กำลังนำท่านไปหน้าหลัก...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-100 rounded-full p-6 w-24 h-24 mx-auto flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-gray-700 font-medium text-lg mb-2">เกิดข้อผิดพลาด</p>
          <p className="text-red-600 text-sm mb-4">{errorMessage}</p>
          <p className="text-gray-500 text-sm">กำลังนำท่านกลับไปหน้าเข้าสู่ระบบ...</p>
        </div>
      </div>
    )
  }

  return null
}

export default function AuthCallbackPage() {
  return <AuthCallbackContent />
}

