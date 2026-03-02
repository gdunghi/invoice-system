import { describe, expect, it, vi, beforeEach } from 'vitest'

// Hoist mocks
const mockSignUp = vi.hoisted(() => vi.fn())
const mockSignInWithPassword = vi.hoisted(() => vi.fn())
const mockSignInWithOAuth = vi.hoisted(() => vi.fn())
const mockSignOut = vi.hoisted(() => vi.fn())
const mockGetUser = vi.hoisted(() => vi.fn())
const mockGetSession = vi.hoisted(() => vi.fn())
const mockFrom = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp(),
      signInWithPassword: mockSignInWithPassword(),
      signInWithOAuth: mockSignInWithOAuth(),
      signOut: mockSignOut(),
      getUser: mockGetUser(),
      getSession: mockGetSession(),
    },
    from: mockFrom(),
  },
}))

// Import after mocking
import { signUp, signIn, signInWithGoogle, signOut, getCurrentUser, hasRole, canEditInvoice } from '@/lib/auth'

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('should sign up user with email and password', async () => {
      const mockData = {
        user: { id: '1', email: 'test@example.com' },
        session: { access_token: 'token' },
      }

      mockSignUp().mockResolvedValue({ data: mockData, error: null })

      const result = await signUp('test@example.com', 'password123', 'Test User')

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      })
      expect(result).toEqual(mockData)
    })

    it('should throw error when signup fails', async () => {
      mockSignUp.mockResolvedValue({
        data: null,
        error: { message: 'Email already exists' },
      })

      await expect(signUp('test@example.com', 'password', 'Test')).rejects.toThrow()
    })
  })

  describe('signIn', () => {
    it('should sign in with email and password', async () => {
      const mockData = {
        user: { id: '1', email: 'test@example.com' },
        session: { access_token: 'token' },
      }

      mockSignInWithPassword.mockResolvedValue({ data: mockData, error: null })

      const result = await signIn('test@example.com', 'password123')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result).toEqual(mockData)
    })

    it('should throw error when credentials are invalid', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      })

      await expect(signIn('test@example.com', 'wrong')).rejects.toThrow()
    })
  })

  describe('signInWithGoogle', () => {
    it('should initiate Google OAuth flow', async () => {
      const mockData = { provider: 'google', url: 'https://google.com/oauth' }

      mockSignInWithOAuth.mockResolvedValue({ data: mockData, error: null })

      // Mock window.location.origin
      global.window = { location: { origin: 'http://localhost:3000' } } as any

      const result = await signInWithGoogle()

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      expect(result).toEqual(mockData)
    })
  })

  describe('signOut', () => {
    it('should sign out user', async () => {
      mockSignOut.mockResolvedValue({ error: null })

      await signOut()

      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('getCurrentUser', () => {
    it('should return user with profile data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      }

      const mockProfile = {
        role: 'admin',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      }

      mockGetUser.mockResolvedValue({ data: { user: mockUser }, error: null })

      const mockSelect = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()
      const mockSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null })

      mockFrom.mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle,
      })

      const result = await getCurrentUser()

      expect(mockGetUser).toHaveBeenCalled()
      expect(mockFrom).toHaveBeenCalledWith('users')
      expect(result).toEqual({
        id: '1',
        email: 'test@example.com',
        full_name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'admin',
      })
    })

    it('should return null when no user is logged in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

      const result = await getCurrentUser()

      expect(result).toBeNull()
    })
  })
})

describe('Authorization Helpers', () => {
  describe('hasRole', () => {
    it('should return true if user has allowed role', () => {
      const user = { id: '1', email: 'test@example.com', role: 'admin' }

      expect(hasRole(user, ['admin', 'accountant'])).toBe(true)
    })

    it('should return false if user does not have allowed role', () => {
      const user = { id: '1', email: 'test@example.com', role: 'viewer' }

      expect(hasRole(user, ['admin', 'accountant'])).toBe(false)
    })

    it('should return false if user is null', () => {
      expect(hasRole(null, ['admin'])).toBe(false)
    })
  })

  describe('canEditInvoice', () => {
    it('should allow admin to edit any invoice', () => {
      const admin = { id: '1', email: 'admin@test.com', role: 'admin' }

      expect(canEditInvoice(admin, 'paid')).toBe(true)
      expect(canEditInvoice(admin, 'draft')).toBe(true)
    })

    it('should allow accountant to edit any invoice', () => {
      const accountant = { id: '1', email: 'acc@test.com', role: 'accountant' }

      expect(canEditInvoice(accountant, 'paid')).toBe(true)
      expect(canEditInvoice(accountant, 'draft')).toBe(true)
    })

    it('should allow sales to edit draft and sent invoices only', () => {
      const sales = { id: '1', email: 'sales@test.com', role: 'sales' }

      expect(canEditInvoice(sales, 'draft')).toBe(true)
      expect(canEditInvoice(sales, 'sent')).toBe(true)
      expect(canEditInvoice(sales, 'paid')).toBe(false)
      expect(canEditInvoice(sales, 'cancelled')).toBe(false)
    })

    it('should not allow viewer to edit any invoice', () => {
      const viewer = { id: '1', email: 'viewer@test.com', role: 'viewer' }

      expect(canEditInvoice(viewer, 'draft')).toBe(false)
      expect(canEditInvoice(viewer, 'sent')).toBe(false)
      expect(canEditInvoice(viewer, 'paid')).toBe(false)
    })

    it('should return false if user is null', () => {
      expect(canEditInvoice(null, 'draft')).toBe(false)
    })
  })
})



