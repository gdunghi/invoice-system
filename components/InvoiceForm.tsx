'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createInvoice, updateInvoice, getCustomers, calculateTotals, formatCurrency } from '@/lib/api'
import { Invoice, InvoiceItem, Customer, InvoiceInsert } from '@/lib/supabase'
import { Plus, Trash2, Save, Eye } from 'lucide-react'

interface InvoiceFormItem {
  description: string
  quantity: number
  unit: string
  unit_price: number
}

interface InvoiceFormData {
  invoice_number?: string
  invoice_date: string
  due_date: string
  seller_name: string
  company_name: string
  company_address: string
  company_tax_id: string
  company_phone: string
  company_website: string
  customer_id: string
  customer_name: string
  customer_address: string
  customer_tax_id: string
  contact_name: string
  contact_phone: string
  contact_email: string
  vat_rate: number
  withholding_tax_rate: number
  notes: string
  status: Invoice['status']
}

const DEFAULT_COMPANY = {
  company_name: 'บริษัท ทอมแอนด์เฟรนด์เทคโนโลยี จำกัด (สำนักงานใหญ่)',
  company_address: 'เลขที่ 265 ชั้น 2 ซอยเพชรเกษม 102/3 แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร 10160',
  company_tax_id: '0105559192600',
  company_phone: '08-5492-2469',
  company_website: 'www.tomandfriends.co',
}

interface InvoiceFormProps {
  invoice?: Invoice
  items?: InvoiceItem[]
}

export default function InvoiceForm({ invoice, items }: InvoiceFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])

  const [formData, setFormData] = useState<InvoiceFormData>({
    invoice_number: invoice?.invoice_number || '',
    invoice_date: invoice?.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoice?.due_date || '',
    seller_name: invoice?.seller_name || 'จิรายุ โพธิสาร',
    ...DEFAULT_COMPANY,
    ...(invoice ? {
      company_name: invoice.company_name,
      company_address: invoice.company_address || '',
      company_tax_id: invoice.company_tax_id || '',
      company_phone: invoice.company_phone || '',
      company_website: invoice.company_website || '',
    } : {}),
    customer_id: invoice?.customer_id || '',
    customer_name: invoice?.customer_name || '',
    customer_address: invoice?.customer_address || '',
    customer_tax_id: invoice?.customer_tax_id || '',
    contact_name: invoice?.contact_name || '',
    contact_phone: invoice?.contact_phone || '',
    contact_email: invoice?.contact_email || '',
    vat_rate: invoice?.vat_rate ?? 7,
    withholding_tax_rate: invoice?.withholding_tax_rate ?? 3,
    notes: invoice?.notes || '',
    status: invoice?.status || 'draft',
  })

  const [lineItems, setLineItems] = useState<InvoiceFormItem[]>(
    items?.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
    })) || [{ description: '', quantity: 1, unit: 'วัน', unit_price: 0 }]
  )

  useEffect(() => {
    getCustomers().then(setCustomers).catch(console.error)
  }, [])

  const { subtotal, vat_amount, withholding_tax_amount, total } = calculateTotals(
    lineItems,
    formData.vat_rate,
    formData.withholding_tax_rate
  )

  function handleCustomerSelect(customerId: string) {
    const customer = customers.find(c => c.id === customerId)
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_address: customer.address || '',
        customer_tax_id: customer.tax_id || '',
        contact_name: customer.contact_name || '',
        contact_phone: customer.phone || '',
        contact_email: customer.email || '',
      }))
    }
  }

  function updateItem(index: number, field: keyof InvoiceFormItem, value: string | number) {
    setLineItems(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  function addItem() {
    setLineItems(prev => [...prev, { description: '', quantity: 1, unit: 'วัน', unit_price: 0 }])
  }

  function removeItem(index: number) {
    setLineItems(prev => prev.filter((_, i) => i !== index))
  }

  const canEditInvoiceNumber = !!invoice && formData.status !== 'paid' && formData.status !== 'cancelled'

  async function handleSave(e: React.FormEvent, redirect?: string) {
    e.preventDefault()
    setSaving(true)
    try {
      const { invoice_number, ...restFormData } = formData
      const invoiceData: Partial<InvoiceInsert> = {
        ...restFormData,
        subtotal,
        vat_amount,
        withholding_tax_amount,
        total,
      }

      if (canEditInvoiceNumber && invoice_number) {
        invoiceData.invoice_number = invoice_number
      }

      const itemsForSave = lineItems.map((item, index) => ({
        ...item,
        item_order: index + 1,
      }))

      let savedInvoice: Invoice
      if (invoice) {
        savedInvoice = await updateInvoice(invoice.id, invoiceData, itemsForSave)
      } else {
        savedInvoice = await createInvoice(invoiceData as Omit<InvoiceInsert, 'invoice_number'>, itemsForSave)
      }

      if (redirect === 'preview') {
        router.push(`/invoices/${savedInvoice.id}`)
      } else {
        router.push('/')
      }
    } catch (err: any) {
      console.error(err)
      alert('เกิดข้อผิดพลาด: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={(e) => handleSave(e)}>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Company Info */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#7B5EA7] rounded-full" />
            ข้อมูลบริษัทผู้ออก Invoice
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">ชื่อบริษัท</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] focus:border-transparent"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">ที่อยู่</label>
              <textarea
                value={formData.company_address}
                onChange={e => setFormData(p => ({ ...p, company_address: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">เลขประจำตัวผู้เสียภาษี</label>
              <input
                type="text"
                value={formData.company_tax_id}
                onChange={e => setFormData(p => ({ ...p, company_tax_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">เบอร์โทร</label>
              <input
                type="text"
                value={formData.company_phone}
                onChange={e => setFormData(p => ({ ...p, company_phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">เว็บไซต์</label>
              <input
                type="text"
                value={formData.company_website}
                onChange={e => setFormData(p => ({ ...p, company_website: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">ผู้ขาย / Seller</label>
              <input
                type="text"
                value={formData.seller_name}
                onChange={e => setFormData(p => ({ ...p, seller_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
          </div>
        </section>

        {/* Invoice Meta */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#7B5EA7] rounded-full" />
            ข้อมูล Invoice
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {invoice && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">เลขที่ Invoice</label>
                <input
                  type="text"
                  value={formData.invoice_number || ''}
                  onChange={e => setFormData(p => ({ ...p, invoice_number: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] disabled:bg-gray-50 disabled:text-gray-400"
                  disabled={!canEditInvoiceNumber}
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-1">วันที่ออก Invoice</label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={e => setFormData(p => ({ ...p, invoice_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">ครบกำหนด</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(p => ({ ...p, due_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">สถานะ</label>
              <select
                value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value as Invoice['status'] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              >
                <option value="draft">ร่าง</option>
                <option value="sent">ส่งแล้ว</option>
                <option value="paid">ชำระแล้ว</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
            </div>
          </div>
        </section>

        {/* Customer */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#7B5EA7] rounded-full" />
            ข้อมูลลูกค้า
          </h2>

          {customers.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">เลือกลูกค้าที่มีอยู่</label>
              <select
                onChange={e => handleCustomerSelect(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              >
                <option value="">-- กรอกข้อมูลใหม่ --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">ชื่อบริษัท / ลูกค้า *</label>
              <input
                type="text"
                value={formData.customer_name}
                onChange={e => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">ที่อยู่</label>
              <textarea
                value={formData.customer_address}
                onChange={e => setFormData(p => ({ ...p, customer_address: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] h-16 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">เลขประจำตัวผู้เสียภาษี</label>
              <input
                type="text"
                value={formData.customer_tax_id}
                onChange={e => setFormData(p => ({ ...p, customer_tax_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">ชื่อผู้ติดต่อ</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={e => setFormData(p => ({ ...p, contact_name: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">เบอร์โทรผู้ติดต่อ</label>
              <input
                type="text"
                value={formData.contact_phone}
                onChange={e => setFormData(p => ({ ...p, contact_phone: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">อีเมลผู้ติดต่อ</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={e => setFormData(p => ({ ...p, contact_email: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
              />
            </div>
          </div>
        </section>

        {/* Line Items */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#7B5EA7] rounded-full" />
            รายการสินค้า / บริการ
          </h2>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 font-medium px-1">
              <div className="col-span-5">รายละเอียด</div>
              <div className="col-span-2 text-center">จำนวน</div>
              <div className="col-span-2 text-center">หน่วย</div>
              <div className="col-span-2 text-right">ราคา/หน่วย</div>
              <div className="col-span-1" />
            </div>

            {lineItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={item.description}
                    onChange={e => updateItem(index, 'description', e.target.value)}
                    placeholder="รายละเอียดสินค้า/บริการ"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.5"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={e => updateItem(index, 'unit', e.target.value)}
                    placeholder="วัน"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={e => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-[#7B5EA7]"
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex items-center gap-1 text-sm text-[#7B5EA7] hover:text-[#6A4D96] font-medium"
          >
            <Plus className="w-4 h-4" />
            เพิ่มรายการ
          </button>

          {/* Totals */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">รวมเป็นเงิน</span>
                  <span className="font-medium">฿{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">ภาษีมูลค่าเพิ่ม</span>
                    <input
                      type="number"
                      value={formData.vat_rate}
                      onChange={e => setFormData(p => ({ ...p, vat_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-12 border border-gray-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#7B5EA7]"
                    />
                    <span className="text-gray-500 text-xs">%</span>
                  </div>
                  <span className="font-medium text-[#7B5EA7]">฿{formatCurrency(vat_amount)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">หัก ณ ที่จ่าย</span>
                    <input
                      type="number"
                      value={formData.withholding_tax_rate}
                      onChange={e => setFormData(p => ({ ...p, withholding_tax_rate: parseFloat(e.target.value) || 0 }))}
                      className="w-12 border border-gray-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#7B5EA7]"
                    />
                    <span className="text-gray-500 text-xs">%</span>
                  </div>
                  <span className="font-medium text-[#7B5EA7]">-฿{formatCurrency(withholding_tax_amount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2">
                  <span>ยอดรวมทั้งสิ้น</span>
                  <span className="text-[#7B5EA7]">฿{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#7B5EA7] rounded-full" />
            หมายเหตุ
          </h2>
          <textarea
            value={formData.notes}
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            placeholder="หมายเหตุ (ถ้ามี)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5EA7] h-20 resize-none"
          />
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSave(e as any, 'preview')}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#7B5EA7] text-white rounded-lg text-sm font-medium hover:bg-[#6A4D96] transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            บันทึก & ดูตัวอย่าง
          </button>
        </div>
      </div>
    </form>
  )
}
