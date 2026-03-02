import '@testing-library/jest-dom/vitest'
import React from 'react'
import { vi } from 'vitest'

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test'

vi.mock('next/link', () => ({
  default: (props: any) => {
    const { href, children, ...rest } = props
    return React.createElement('a', { href, ...rest }, children)
  },
}))

const confirmMock = vi.fn(() => true)
const alertMock = vi.fn()
const printMock = vi.fn()

Object.defineProperty(window, 'confirm', {
  writable: true,
  value: confirmMock,
})

Object.defineProperty(window, 'alert', {
  writable: true,
  value: alertMock,
})

Object.defineProperty(window, 'print', {
  writable: true,
  value: printMock,
})
