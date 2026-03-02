import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InvoiceViewPage from '@/app/invoices/[id]/page'

const mockPush = vi.hoisted(() => vi.fn())
const mockUseParams = vi.hoisted(() => vi.fn(() => ({ id: 'inv-1' })))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockUseParams(),
}))

const mockGetInvoiceById = vi.hoisted(() => vi.fn())
const mockUpdateInvoiceStatus = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getInvoiceById: mockGetInvoiceById,
    updateInvoiceStatus: mockUpdateInvoiceStatus,
  }
})

describe('Invoice view page', () => {
  it('loads invoice data and allows marking as paid', async () => {
    const baseInvoice = {
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
      status: 'sent',
      created_at: '2025-01-01',
      updated_at: '2025-01-02',
    }

    mockGetInvoiceById.mockResolvedValue({
      invoice: baseInvoice,
      items: [
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
      ],
    })

    mockUpdateInvoiceStatus.mockResolvedValue({
      ...baseInvoice,
      status: 'paid',
    })

    render(<InvoiceViewPage />)

    expect(await screen.findByRole('heading', { name: 'BL2025000001' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'ชำระแล้ว' }))

    await waitFor(() => {
      expect(mockUpdateInvoiceStatus).toHaveBeenCalledWith('inv-1', 'paid')
    })
  })
})
