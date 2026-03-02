import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import InvoiceTemplate from '@/components/InvoiceTemplate'
import { Invoice, InvoiceItem } from '@/lib/supabase'

const baseInvoice: Invoice = {
  id: 'inv-1',
  invoice_number: 'BL2025000001',
  invoice_date: '2025-01-10',
  due_date: '2025-01-20',
  seller_name: 'Seller',
  company_name: 'Company',
  company_address: 'Bangkok',
  company_tax_id: '123',
  company_phone: '0123',
  company_website: 'example.com',
  customer_id: null,
  customer_name: 'Customer',
  customer_address: 'Customer Address',
  customer_tax_id: '999',
  contact_name: 'Contact',
  contact_phone: '089',
  contact_email: 'test@example.com',
  subtotal: 200,
  vat_rate: 7,
  withholding_tax_rate: 3,
  withholding_tax_amount: 6,
  vat_amount: 14,
  total: 208,
  notes: 'Note',
  status: 'draft',
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
}

const items: InvoiceItem[] = [
  {
    id: 'item-1',
    invoice_id: 'inv-1',
    item_order: 1,
    description: 'Service',
    quantity: 2,
    unit: 'day',
    unit_price: 100,
    total: 200,
    created_at: '2025-01-01',
  },
]

describe('InvoiceTemplate', () => {
  it('renders invoice details and totals', () => {
    render(
      <InvoiceTemplate
        invoice={baseInvoice}
        items={items}
        copyLabel="ต้นฉบับ"
        pageNo={1}
      />
    )

    expect(screen.getByText(baseInvoice.company_name)).toBeInTheDocument()
    expect(screen.getByText(baseInvoice.invoice_number)).toBeInTheDocument()
    expect(screen.getByText(baseInvoice.customer_name)).toBeInTheDocument()
    expect(screen.getByText('ต้นฉบับ')).toBeInTheDocument()
    expect(screen.getByText(/208\.00/)).toBeInTheDocument()
  })
})
