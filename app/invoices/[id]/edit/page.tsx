'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceById } from '@/lib/api'
import { Invoice, InvoiceItem } from '@/lib/supabase'
import InvoiceForm from '@/components/InvoiceForm'
import { ArrowLeft } from 'lucide-react'

export default function EditInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getInvoiceById(params.id as string)
        setInvoice(data.invoice)
        setItems(data.items)
      } catch (err: any) {
        alert('ไม่พบ Invoice')
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7B5EA7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href={`/invoices/${params.id}`} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">แก้ไข Invoice</h1>
            <p className="text-xs text-gray-500">{invoice?.invoice_number}</p>
          </div>
        </div>
      </header>
      {invoice && <InvoiceForm invoice={invoice} items={items} />}
    </div>
  )
}
