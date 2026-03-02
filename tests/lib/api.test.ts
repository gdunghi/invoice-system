import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '@/lib/api'

const fromMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: fromMock,
  },
}))

type ResponseMap = {
  order?: any
  single?: any
  insert?: any
  update?: any
  delete?: any
  lte?: any
  eq?: any
}

function makeBuilder(
  responses: ResponseMap,
  options?: {
    insertReturnsPromise?: boolean
    eqReturnsPromise?: boolean
    orderReturnsPromise?: boolean
    lteReturnsPromise?: boolean
    updateReturnsPromise?: boolean
    deleteReturnsPromise?: boolean
  }
) {
  const builder: any = {}
  const returnBuilder = () => builder
  const terminal = (key: keyof ResponseMap) => () => Promise.resolve(responses[key])
  const {
    insertReturnsPromise = false,
    eqReturnsPromise = false,
    orderReturnsPromise = false,
    lteReturnsPromise = false,
    updateReturnsPromise = false,
    deleteReturnsPromise = false,
  } = options || {}

  builder.select = vi.fn(returnBuilder)
  builder.order = vi.fn(orderReturnsPromise && responses.order ? terminal('order') : returnBuilder)
  builder.single = vi.fn(terminal('single'))
  builder.insert = vi.fn(insertReturnsPromise && responses.insert ? terminal('insert') : returnBuilder)
  builder.update = vi.fn(updateReturnsPromise && responses.update ? terminal('update') : returnBuilder)
  builder.delete = vi.fn(deleteReturnsPromise && responses.delete ? terminal('delete') : returnBuilder)
  builder.eq = vi.fn(eqReturnsPromise && responses.eq ? terminal('eq') : returnBuilder)
  builder.gte = vi.fn(returnBuilder)
  builder.lte = vi.fn(lteReturnsPromise && responses.lte ? terminal('lte') : returnBuilder)

  return builder
}

beforeEach(() => {
  fromMock.mockReset()
})

describe('lib/api helpers', () => {
  it('calculates totals with VAT and withholding', () => {
    const result = api.calculateTotals(
      [
        { quantity: 2, unit_price: 100 },
        { quantity: 1, unit_price: 50 },
      ],
      7,
      3
    )

    expect(result.subtotal).toBe(250)
    expect(result.vat_amount).toBeCloseTo(17.5)
    expect(result.withholding_tax_amount).toBeCloseTo(7.5)
    expect(result.total).toBeCloseTo(260)
  })

  it('formats Thai words for zero and decimals', () => {
    expect(api.numberToThaiWords(0)).toBe('ศูนย์บาทถ้วน')
    expect(api.numberToThaiWords(21.25)).toContain('สตางค์')
  })

  it('formats currency and date', () => {
    expect(api.formatCurrency(1000)).toBe('1,000.00')
    expect(api.formatDate('2024-01-05')).toBe('05/01/2567')
  })
})

describe('lib/api data access', () => {
  it('gets invoices ordered by date', async () => {
    const invoices = [{ id: '1' }, { id: '2' }]
    fromMock.mockReturnValueOnce(makeBuilder({ order: { data: invoices, error: null } }, { orderReturnsPromise: true }))

    const result = await api.getInvoices()

    expect(result).toEqual(invoices)
  })

  it('gets invoice by id with items', async () => {
    const invoice = { id: 'inv-1' }
    const items = [{ id: 'item-1' }]

    fromMock
      .mockReturnValueOnce(makeBuilder({ single: { data: invoice, error: null } }))
      .mockReturnValueOnce(makeBuilder({ order: { data: items, error: null } }, { orderReturnsPromise: true }))

    const result = await api.getInvoiceById('inv-1')

    expect(result.invoice).toEqual(invoice)
    expect(result.items).toEqual(items)
  })

  it('generates invoice number with yearly sequence', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-06-01T00:00:00.000Z'))

    fromMock.mockReturnValueOnce(makeBuilder({ lte: { count: 4 } }, { lteReturnsPromise: true }))

    const result = await api.generateInvoiceNumber()

    expect(result).toBe('BL2025000005')

    vi.useRealTimers()
  })

  it('creates invoice and inserts items', async () => {
    const invoice = { id: 'inv-1', invoice_number: 'BL2025000001' }

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))

    const invoiceBuilder: any = {}
    invoiceBuilder.select = vi.fn(() => invoiceBuilder)
    invoiceBuilder.gte = vi.fn(() => invoiceBuilder)
    invoiceBuilder.lte = vi.fn(() => Promise.resolve({ count: 0 }))
    invoiceBuilder.insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: invoice, error: null })),
      })),
    }))

    const itemsBuilder: any = {}
    itemsBuilder.insert = vi.fn(() => Promise.resolve({ error: null }))

    fromMock.mockImplementation((table: string) => {
      if (table === 'invoices') return invoiceBuilder
      if (table === 'invoice_items') return itemsBuilder
      return makeBuilder({})
    })

    const result = await api.createInvoice(
      {
        invoice_date: '2025-01-01',
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
        subtotal: 100,
        vat_rate: 7,
        withholding_tax_rate: 3,
        withholding_tax_amount: 3,
        vat_amount: 7,
        total: 104,
        notes: null,
        status: 'draft',
      },
      [{ description: 'Work', quantity: 1, unit: 'day', unit_price: 100, item_order: 1 }]
    )

    expect(result).toEqual(invoice)

    vi.useRealTimers()
  })

  it('updates invoice and replaces items', async () => {
    const invoice = { id: 'inv-2' }

    fromMock
      .mockReturnValueOnce(makeBuilder({ single: { data: invoice, error: null } }))
      .mockReturnValueOnce(makeBuilder({ eq: { error: null } }, { eqReturnsPromise: true }))
      .mockReturnValueOnce(makeBuilder({ insert: { error: null } }, { insertReturnsPromise: true }))

    const result = await api.updateInvoice('inv-2', { customer_name: 'Updated' }, [
      { description: 'New', quantity: 2, unit: 'day', unit_price: 200, item_order: 1 },
    ])

    expect(result).toEqual(invoice)
  })

  it('deletes an invoice', async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ eq: { error: null } }, { eqReturnsPromise: true }))

    await expect(api.deleteInvoice('inv-3')).resolves.toBeUndefined()
  })

  it('updates invoice status', async () => {
    const invoice = { id: 'inv-4', status: 'paid' }

    fromMock.mockReturnValueOnce(makeBuilder({ single: { data: invoice, error: null } }))

    const result = await api.updateInvoiceStatus('inv-4', 'paid')

    expect(result).toEqual(invoice)
  })

  it('gets customers', async () => {
    const customers = [{ id: 'cust-1' }]
    fromMock.mockReturnValueOnce(makeBuilder({ order: { data: customers, error: null } }, { orderReturnsPromise: true }))

    const result = await api.getCustomers()

    expect(result).toEqual(customers)
  })

  it('creates a customer', async () => {
    const customer = { id: 'cust-2' }
    fromMock.mockReturnValueOnce(makeBuilder({ single: { data: customer, error: null } }))

    const result = await api.createCustomer({
      name: 'Customer',
      address: null,
      tax_id: null,
      contact_name: null,
      phone: null,
      email: null,
    })

    expect(result).toEqual(customer)
  })
})

