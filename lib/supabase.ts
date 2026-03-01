import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      invoices: {
        Row: Invoice
        Insert: InvoiceInsert
        Update: Partial<InvoiceInsert>
      }
      invoice_items: {
        Row: InvoiceItem
        Insert: InvoiceItemInsert
        Update: Partial<InvoiceItemInsert>
      }
      customers: {
        Row: Customer
        Insert: CustomerInsert
        Update: Partial<CustomerInsert>
      }
    }
  }
}

export type Invoice = {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  seller_name: string
  company_name: string
  company_address: string | null
  company_tax_id: string | null
  company_phone: string | null
  company_website: string | null
  customer_id: string | null
  customer_name: string
  customer_address: string | null
  customer_tax_id: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  subtotal: number
  vat_rate: number
  withholding_tax_rate: number
  withholding_tax_amount: number
  vat_amount: number
  total: number
  notes: string | null
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>

export type InvoiceItem = {
  id: string
  invoice_id: string
  item_order: number
  description: string
  quantity: number
  unit: string
  unit_price: number
  total: number
  created_at: string
}

export type InvoiceItemInsert = Omit<InvoiceItem, 'id' | 'total' | 'created_at'>

export type Customer = {
  id: string
  name: string
  address: string | null
  tax_id: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export type CustomerInsert = Omit<Customer, 'id' | 'created_at'>
