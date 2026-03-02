'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import InvoiceForm from '@/components/InvoiceForm'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'

export default function NewInvoicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
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
  }

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
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">สร้าง Invoice ใหม่</h1>
            <p className="text-xs text-gray-500">กรอกข้อมูลเพื่อสร้างใบแจ้งหนี้</p>
          </div>
        </div>
      </header>
      <InvoiceForm />
    </div>
  )
}
