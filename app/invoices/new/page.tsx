'use client'

import { useEffect, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import InvoiceForm from '@/components/InvoiceForm'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

function InvoiceFormContent() {
  const searchParams = useSearchParams()
  const docType = searchParams.get('type') as 'invoice' | 'tax_invoice' || 'invoice'

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {docType === 'tax_invoice' ? 'สร้าง Tax Invoice' : 'สร้าง Invoice'}
            </h1>
            <p className="text-xs text-gray-500 px-2 py-1 bg-purple-50 rounded inline-block mt-1">
              {docType === 'tax_invoice'
                ? '📋 ใบกำกับภาษี (Tax Invoice) - ใช้หักภาษีได้'
                : '📄 ใบแจ้งหนี้ (Invoice) - ใบแจ้งหนี้ทั่วไป'}
            </p>
          </div>
        </div>
      </header>
      <InvoiceForm documentType={docType} />
    </div>
  )
}

export default function NewInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?redirect=/invoices/new')
        return
      }
      setLoading(false)
    } catch (err) {
      console.error('Auth error:', err)
      router.push('/login?redirect=/invoices/new')
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading form...</p>
          </div>
        </div>
      }
    >
      <InvoiceFormContent />
    </Suspense>
  )
}
