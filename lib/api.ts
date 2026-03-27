import { supabase, Invoice, InvoiceItem, Customer, InvoiceInsert, InvoiceItemInsert } from './supabase'

// ========== INVOICE FUNCTIONS ==========

export async function getInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Invoice[]
}

export async function getInvoiceById(id: string) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('item_order', { ascending: true })

  if (itemsError) throw itemsError

  return { invoice: invoice as Invoice, items: items as InvoiceItem[] }
}

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)

  const seq = ((count || 0) + 1).toString().padStart(6, '0')
  return `BL${year}${seq}`
}

export async function generateTaxInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('document_type', 'tax_invoice')
    .gte('created_at', `${year}-01-01`)
    .lte('created_at', `${year}-12-31`)

  const seq = ((count || 0) + 1).toString().padStart(3, '0')
  return `RE${year}${seq}`
}

export async function createTaxInvoiceFromInvoice(
  invoiceId: string
): Promise<Invoice> {
  // Get source invoice with items
  const { invoice: sourceInvoice, items: sourceItems } = await getInvoiceById(invoiceId)

  if (!sourceInvoice) throw new Error('Invoice not found')

  // Generate new tax invoice number
  const invoice_number = await generateTaxInvoiceNumber()

  // Create new tax invoice
  const { data: newInvoice, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      invoice_date: sourceInvoice.invoice_date,
      due_date: sourceInvoice.due_date,
      seller_name: sourceInvoice.seller_name,
      company_name: sourceInvoice.company_name,
      company_address: sourceInvoice.company_address,
      company_tax_id: sourceInvoice.company_tax_id,
      company_phone: sourceInvoice.company_phone,
      company_website: sourceInvoice.company_website,
      customer_id: sourceInvoice.customer_id,
      customer_name: sourceInvoice.customer_name,
      customer_address: sourceInvoice.customer_address,
      customer_tax_id: sourceInvoice.customer_tax_id,
      contact_name: sourceInvoice.contact_name,
      contact_phone: sourceInvoice.contact_phone,
      contact_email: sourceInvoice.contact_email,
      vat_rate: sourceInvoice.vat_rate,
      withholding_tax_rate: sourceInvoice.withholding_tax_rate,
      document_type: 'tax_invoice',
      referenced_invoice_number: sourceInvoice.invoice_number,
      notes: sourceInvoice.notes,
      status: 'draft',
    })
    .select()
    .single()

  if (error) throw error

  // Clone invoice items
  if (sourceItems.length > 0) {
    const itemsWithId = sourceItems.map((item, index) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      invoice_id: newInvoice.id,
      item_order: index + 1,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithId)

    if (itemsError) throw itemsError
  }

  return newInvoice as Invoice
}

export async function createInvoice(
  invoiceData: Omit<InvoiceInsert, 'invoice_number'>,
  items: Omit<InvoiceItemInsert, 'invoice_id'>[]
) {
  const invoice_number = await generateInvoiceNumber()

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({ ...invoiceData, invoice_number })
    .select()
    .single()

  if (error) {
    console.error(error)
    throw error
  }

  if (items.length > 0) {
    const itemsWithId = items.map((item, index) => ({
      ...item,
      invoice_id: invoice.id,
      item_order: index + 1,
    }))

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsWithId)

    if (itemsError){
        console.error(itemsError)
      throw itemsError
    }
  }

  return invoice as Invoice
}

export async function updateInvoice(
  id: string,
  invoiceData: Partial<InvoiceInsert>,
  items?: Omit<InvoiceItemInsert, 'invoice_id'>[]
) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .update(invoiceData)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (items !== undefined) {
    await supabase.from('invoice_items').delete().eq('invoice_id', id)

    if (items.length > 0) {
      const itemsWithId = items.map((item, index) => ({
        ...item,
        invoice_id: id,
        item_order: index + 1,
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsWithId)

      if (itemsError) throw itemsError
    }
  }

  return invoice as Invoice
}

export async function deleteInvoice(id: string) {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']) {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error(error)
    throw error
  }
  return data as Invoice
}

// ========== CUSTOMER FUNCTIONS ==========

export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    console.error(error)
    throw error
  }
  return data as Customer[]
}

export async function createCustomer(customerData: Omit<Customer, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customerData)
    .select()
    .single()

  if (error) {
    console.error(error)
    throw error
  }
  return data as Customer
}

// ========== HELPERS ==========

export function calculateTotals(
    items: { quantity: number; unit_price: number }[],
    vatRate: number = 7,
    withholdingRate: number = 3  // เพิ่มตรงนี้
) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const vat_amount = subtotal * (vatRate / 100)
  const withholding_tax_amount = subtotal * (withholdingRate / 100)  // คำนวณจาก subtotal ก่อน VAT
  const total = subtotal + vat_amount - withholding_tax_amount  // หักออกจากยอดรวม
  return { subtotal, vat_amount, withholding_tax_amount, total }
}

export function numberToThaiWords(amount: number): string {
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const tens = ['', 'สิบ', 'ยี่สิบ', 'สามสิบ', 'สี่สิบ', 'ห้าสิบ', 'หกสิบ', 'เจ็ดสิบ', 'แปดสิบ', 'เก้าสิบ']
  const positions = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']

  if (amount === 0) return 'ศูนย์บาทถ้วน'

  const intPart = Math.floor(amount)
  const decPart = Math.round((amount - intPart) * 100)

  function convertGroup(n: number): string {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 100) {
      const t = Math.floor(n / 10)
      const o = n % 10
      return (t === 1 ? 'สิบ' : tens[t]) + (o > 0 ? ones[o] : '')
    }
    const hundreds = Math.floor(n / 100)
    const remainder = n % 100
    return ones[hundreds] + 'ร้อย' + convertGroup(remainder)
  }

  function convertLarge(n: number): string {
    if (n < 1000000) {
      const hundredThousands = Math.floor(n / 100000)
      const tenThousands = Math.floor((n % 100000) / 10000)
      const thousands = Math.floor((n % 10000) / 1000)
      const hundreds = Math.floor((n % 1000) / 100)
      const tensDigit = Math.floor((n % 100) / 10)
      const onesDigit = n % 10
      let result = ''
      if (hundredThousands > 0) result += ones[hundredThousands] + 'แสน'
      if (tenThousands > 0) result += ones[tenThousands] + 'หมื่น'
      if (thousands > 0) result += ones[thousands] + 'พัน'
      if (hundreds > 0) result += ones[hundreds] + 'ร้อย'
      if (tensDigit > 0) result += (tensDigit === 1 ? 'สิบ' : tens[tensDigit])
      if (onesDigit > 0) result += ones[onesDigit]
      return result
    }
    const millions = Math.floor(n / 1000000)
    const remainder = n % 1000000
    return convertLarge(millions) + 'ล้าน' + convertLarge(remainder)
  }

  let result = convertLarge(intPart) + 'บาท'
  if (decPart > 0) {
    result += convertGroup(decPart) + 'สตางค์'
  } else {
    result += 'ถ้วน'
  }
  return result
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
