import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import InvoiceForm from '@/components/InvoiceForm'

const mockPush = vi.hoisted(() => vi.fn())
const mockBack = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}))

const mockCreateInvoice = vi.hoisted(() => vi.fn())
const mockUpdateInvoice = vi.hoisted(() => vi.fn())
const mockGetCustomers = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', () => ({
  createInvoice: mockCreateInvoice,
  updateInvoice: mockUpdateInvoice,
  getCustomers: mockGetCustomers,
  calculateTotals: (items: { quantity: number; unit_price: number }[], vatRate = 7, withholdingRate = 3) => {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const vat_amount = subtotal * (vatRate / 100)
    const withholding_tax_amount = subtotal * (withholdingRate / 100)
    const total = subtotal + vat_amount - withholding_tax_amount
    return { subtotal, vat_amount, withholding_tax_amount, total }
  },
  formatCurrency: (amount: number) => new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount),
}))

describe('InvoiceForm', () => {
  it('adds a new line item row', async () => {
    mockGetCustomers.mockResolvedValue([])

    render(<InvoiceForm />)

    await waitFor(() => expect(mockGetCustomers).toHaveBeenCalled())
    expect(screen.getAllByPlaceholderText('รายละเอียดสินค้า/บริการ')).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'เพิ่มรายการ' }))

    expect(screen.getAllByPlaceholderText('รายละเอียดสินค้า/บริการ')).toHaveLength(2)
  })

  it('recalculates totals when items change', async () => {
    mockGetCustomers.mockResolvedValue([])

    render(<InvoiceForm />)

    await waitFor(() => expect(mockGetCustomers).toHaveBeenCalled())

    const spinButtons = screen.getAllByRole('spinbutton')
    const quantityInput = spinButtons[0]
    const unitPriceInput = spinButtons[1]

    await userEvent.clear(quantityInput)
    await userEvent.type(quantityInput, '2')
    await userEvent.clear(unitPriceInput)
    await userEvent.type(unitPriceInput, '100')

    expect(await screen.findByText('฿200.00')).toBeInTheDocument()
    expect(screen.getByText('฿14.00')).toBeInTheDocument()
    expect(screen.getByText('-฿6.00')).toBeInTheDocument()
    expect(screen.getByText('฿208.00')).toBeInTheDocument()
  })

  it('submits a new invoice and redirects', async () => {
    mockGetCustomers.mockResolvedValue([])
    mockCreateInvoice.mockResolvedValue({ id: 'inv-1' })

    render(<InvoiceForm />)

    await waitFor(() => expect(mockGetCustomers).toHaveBeenCalled())

    const customerLabel = screen.getByText('ชื่อบริษัท / ลูกค้า *')
    const customerInput = customerLabel.parentElement?.querySelector('input')

    expect(customerInput).toBeTruthy()

    await userEvent.type(customerInput as HTMLInputElement, 'Customer Co., Ltd.')

    await userEvent.type(
      screen.getByPlaceholderText('รายละเอียดสินค้า/บริการ'),
      'Service work'
    )

    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      expect(mockCreateInvoice).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })
})
