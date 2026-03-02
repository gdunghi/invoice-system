import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Home from '@/app/page'

const mockGetInvoices = vi.hoisted(() => vi.fn())
const mockDeleteInvoice = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api')
  return {
    ...actual,
    getInvoices: mockGetInvoices,
    deleteInvoice: mockDeleteInvoice,
  }
})

describe('Home page', () => {
  it('renders invoices from API', async () => {
    mockGetInvoices.mockResolvedValue([
      {
        id: 'inv-1',
        invoice_number: 'BL2025000001',
        invoice_date: '2025-01-10',
        customer_name: 'Customer A',
        contact_name: null,
        total: 100,
        status: 'draft',
      },
    ])

    render(<Home />)

    expect(await screen.findByText('BL2025000001')).toBeInTheDocument()
    expect(screen.getByText('Customer A')).toBeInTheDocument()
  })

  it('deletes invoice after confirmation', async () => {
    mockGetInvoices.mockResolvedValue([
      {
        id: 'inv-2',
        invoice_number: 'BL2025000002',
        invoice_date: '2025-01-11',
        customer_name: 'Customer B',
        contact_name: null,
        total: 200,
        status: 'sent',
      },
    ])
    mockDeleteInvoice.mockResolvedValue(undefined)

    render(<Home />)

    await screen.findByText('BL2025000002')

    await userEvent.click(screen.getByTitle('ลบ'))

    await waitFor(() => {
      expect(mockDeleteInvoice).toHaveBeenCalledWith('inv-2')
    })
  })
})

