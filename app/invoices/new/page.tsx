import Link from 'next/link'
import InvoiceForm from '@/components/InvoiceForm'
import { ArrowLeft } from 'lucide-react'

export default function NewInvoicePage() {
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
