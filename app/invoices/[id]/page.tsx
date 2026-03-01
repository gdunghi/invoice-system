'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInvoiceById, updateInvoiceStatus } from '@/lib/api'
import { Invoice, InvoiceItem } from '@/lib/supabase'
import InvoiceTemplate from '@/components/InvoiceTemplate'
import { ArrowLeft, Printer, Download, Edit, CheckCircle } from 'lucide-react'

export default function InvoiceViewPage() {
  const params = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadInvoice()
  }, [params.id])

  async function loadInvoice() {
    try {
      const { invoice, items } = await getInvoiceById(params.id as string)
      setInvoice(invoice)
      setItems(items)
    } catch (err: any) {
      alert('ไม่พบ Invoice: ' + err.message)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid() {
    if (!invoice) return
    if (!confirm('ยืนยันการเปลี่ยนสถานะเป็น "ชำระแล้ว"?')) return
    try {
      const updated = await updateInvoiceStatus(invoice.id, 'paid')
      setInvoice(updated)
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    }
  }

  function handlePrint() {
    window.print()
  }

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const { default: jsPDF } = await import('jspdf')

      const element = invoiceRef.current
      if (!element) return

      // Render both copies
      const canvases = element.querySelectorAll('.invoice-page')
      const pdf = new jsPDF('p', 'mm', 'a4')

      for (let i = 0; i < canvases.length; i++) {
        const canvas = await html2canvas(canvases[i] as HTMLElement, {
          scale: 4,
          useCORS: true,
          logging: false,
          width: 794, // A4 at 96dpi
          height: 1123,
          backgroundColor: '#ffffff',
        })

        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
      }

      pdf.save(`${invoice?.invoice_number}.pdf`)
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7B5EA7] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) return null

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Toolbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 no-print">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h1>
              <p className="text-xs text-gray-500">{invoice.customer_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && (
              <button
                onClick={handleMarkPaid}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                ชำระแล้ว
              </button>
            )}
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Edit className="w-4 h-4" />
              แก้ไข
            </Link>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4" />
              พิมพ์
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-[#7B5EA7] text-white rounded-lg text-sm font-medium hover:bg-[#6A4D96] transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF'}
            </button>
          </div>
        </div>
      </header>

      {/* Invoice Preview */}
      <div className="py-8 flex flex-col items-center gap-6" ref={invoiceRef}>
        {/* Original copy */}
        <div className="shadow-xl">
          <InvoiceTemplate invoice={invoice} items={items} copy="ต้นฉบับ" />
        </div>

        {/* Copy */}
        <div className="shadow-xl">
          <InvoiceTemplate invoice={invoice} items={items} copy="สำเนา" />
        </div>
      </div>
    </div>
  )
}
