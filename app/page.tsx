'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getInvoices, deleteInvoice, formatCurrency, formatDate } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth'
import { Invoice } from '@/lib/supabase'
import { Plus, FileText, Eye, Trash2, Edit, CheckCircle, Clock, XCircle, Send, LogOut } from 'lucide-react'

const statusConfig = {
  draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-600', icon: Clock },
  sent: { label: 'ส่งแล้ว', color: 'bg-blue-100 text-blue-700', icon: Send },
  paid: { label: 'ชำระแล้ว', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function Home() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    checkAuthAndLoad()
  }, [])

  async function checkAuthAndLoad() {
    try {
      // Check if user is logged in
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserName(user.full_name || user.email || 'User')
      await loadInvoices()
    } catch (err: any) {
      console.error('Auth error:', err)
      router.push('/login')
    }
  }

  async function loadInvoices() {
    try {
      setLoading(true)
      const data = await getInvoices()
      setInvoices(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const { signOut } = await import('@/lib/auth')
    try {
      await signOut()
      router.push('/login')
    } catch (err: any) {
      console.error('Logout error:', err)
    }
  }

  async function handleDelete(id: string, number: string) {
    if (!confirm(`ยืนยันการลบ Invoice ${number}?`)) return
    setDeleting(id)
    try {
      await deleteInvoice(id)
      setInvoices(invoices.filter(inv => inv.id !== id))
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  const totalAmount = invoices
    .filter(inv => inv.status !== 'cancelled')
    .reduce((sum, inv) => sum + inv.total, 0)
  
  const paidAmount = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0)

  const pendingCount = invoices.filter(inv => inv.status === 'sent').length

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#7B5EA7] rounded flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Invoice System</h1>
              <p className="text-xs text-gray-500">Tom and Friends Technology Co., Ltd.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-sm font-medium text-gray-700">{userName}</p>
              <p className="text-xs text-gray-500">ผู้ใช้งาน</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              📊 Dashboard
            </Link>
            <Link
              href="/invoices/new"
              className="flex items-center gap-2 bg-[#7B5EA7] text-white px-4 py-2 rounded-lg hover:bg-[#6A4D96] transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              สร้าง Invoice ใหม่
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">รายรับทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-900">฿{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.filter(inv => inv.status !== 'cancelled').length} รายการ</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">ชำระแล้ว</p>
            <p className="text-2xl font-bold text-green-600">฿{formatCurrency(paidAmount)}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.filter(inv => inv.status === 'paid').length} รายการ</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 mb-1">รอชำระ</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount} รายการ</p>
            <p className="text-xs text-gray-400 mt-1">ส่งแล้ว รอการชำระ</p>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Invoice ทั้งหมด</h2>
            <span className="text-sm text-gray-500">{invoices.length} รายการ</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#7B5EA7] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-red-500">
              <p>เกิดข้อผิดพลาด: {error}</p>
              <p className="text-sm text-gray-500 mt-2">ตรวจสอบการตั้งค่า Supabase ใน .env.local</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">ยังไม่มี Invoice</p>
              <p className="text-sm mt-1">คลิก สร้าง Invoice ใหม่ เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left px-6 py-3">เลขที่</th>
                    <th className="text-left px-6 py-3">ลูกค้า</th>
                    <th className="text-left px-6 py-3">วันที่</th>
                    <th className="text-right px-6 py-3">ยอดรวม</th>
                    <th className="text-center px-6 py-3">สถานะ</th>
                    <th className="text-center px-6 py-3">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {invoices.map((invoice) => {
                    const status = statusConfig[invoice.status]
                    const StatusIcon = status.icon
                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm font-medium text-[#7B5EA7]">
                            {invoice.invoice_number}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{invoice.customer_name}</p>
                          {invoice.contact_name && (
                            <p className="text-xs text-gray-400">{invoice.contact_name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(invoice.invoice_date)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-semibold text-gray-900">฿{formatCurrency(invoice.total)}</p>
                          <p className="text-xs text-gray-400">รวม VAT</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Link
                              href={`/invoices/${invoice.id}`}
                              className="p-1.5 text-gray-400 hover:text-[#7B5EA7] hover:bg-purple-50 rounded-lg transition-colors"
                              title="ดู Invoice"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link
                              href={`/invoices/${invoice.id}/edit`}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="แก้ไข"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(invoice.id, invoice.invoice_number)}
                              disabled={deleting === invoice.id}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
