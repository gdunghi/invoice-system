import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import EditInvoicePage from '@/app/invoices/[id]/edit/page'

const mockPush = vi.hoisted(() => vi.fn())
const mockUseParams = vi.hoisted(() => vi.fn(() => ({ id: 'inv-1' })))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockUseParams(),
}))

const mockGetInvoiceById = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getInvoiceById: mockGetInvoiceById,
  }
})

describe('Edit invoice page', () => {
  it('loads invoice and renders header', async () => {
    mockGetInvoiceById.mockResolvedValue({
      invoice: {
        id: 'inv-1',
        invoice_number: 'BL2025000001',
        invoice_date: '2025-01-10',
        due_date: null,
        seller_name: 'Seller',
        company_name: 'Company',
        company_address: null,
        company_tax_id: null,
        company_phone: null,
        company_website: null,
        customer_id: null,
        customer_name: 'Customer',
        customer_address: null,
        customer_tax_id: null,
        contact_name: null,
        contact_phone: null,
        contact_email: null,
        subtotal: 200,
        vat_rate: 7,
        withholding_tax_rate: 3,
        withholding_tax_amount: 6,
        vat_amount: 14,
        total: 208,
        notes: null,
        status: 'draft',
        created_at: '2025-01-01',
        updated_at: '2025-01-02',
      },
      items: [],
    })

    render(<EditInvoicePage />)

    expect(await screen.findByText('แก้ไข Invoice')).toBeInTheDocument()
    expect(await screen.findByText('BL2025000001')).toBeInTheDocument()
  })
})

