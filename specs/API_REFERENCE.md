# API Reference & Quick Reference - Invoice System

## 📋 Quick Reference Card

### Routes
| Route | Method | Purpose |
|-------|--------|---------|
| GET `/` | - | View all invoices (dashboard) |
| GET `/invoices/new` | - | Create new invoice form |
| GET `/invoices/[id]` | - | View single invoice |
| GET `/invoices/[id]/edit` | - | Edit invoice form |

### Status Values
```
draft      → ร่าง (Grey)      [Can edit all, including invoice_number]
sent       → ส่งแล้ว (Blue)     [Can edit all, including invoice_number]
paid       → ชำระแล้ว (Green)   [Can edit except invoice_number]
cancelled  → ยกเลิก (Red)      [Can edit except invoice_number]
```

### Default Company Info
```
บริษัท ทอมแอนด์เฟรนด์เทคโนโลยี จำกัด (สำนักงานใหญ่)
Address: เลขที่ 265 ชั้น 2 ซอยเพชรเกษม 102/3 แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร 10160
Tax ID: 0105559192600
Phone: 08-5492-2469
Website: www.tomandfriends.co
Seller: จิรายุ โพธิสาร
```

---

## 🔌 API Functions Reference

### Invoice CRUD Operations

#### `createInvoice(invoiceData, items)`
**Parameters:**
```typescript
invoiceData: {
  invoice_date: string (YYYY-MM-DD)
  due_date?: string (YYYY-MM-DD)
  seller_name: string
  company_name: string
  company_address?: string
  company_tax_id?: string
  company_phone?: string
  company_website?: string
  customer_id?: string
  customer_name: string
  customer_address?: string
  customer_tax_id?: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  subtotal: number
  vat_rate: number
  vat_amount: number
  withholding_tax_rate: number
  withholding_tax_amount: number
  total: number
  notes?: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
}

items: Array<{
  description: string
  quantity: number
  unit: string
  unit_price: number
  item_order?: number  // Auto-assigned by API
}>
```

**Returns:** `Invoice` (with generated id, created_at, updated_at)

**Example:**
```typescript
const invoice = await createInvoice(
  {
    invoice_date: '2026-03-02',
    due_date: '2026-04-02',
    seller_name: 'จิรายุ โพธิสาร',
    company_name: 'บริษัท ทอมแอนด์เฟรนด์เทคโนโลยี จำกัด',
    customer_name: 'บริษัท ออด-อี',
    subtotal: 50000,
    vat_rate: 7,
    vat_amount: 3500,
    withholding_tax_rate: 3,
    withholding_tax_amount: 1500,
    total: 52000,
    status: 'draft'
  },
  [
    { description: 'Consulting', quantity: 10, unit: 'วัน', unit_price: 5000 }
  ]
)
```

---

#### `updateInvoice(id, invoiceData, items?)`
**Parameters:**
```typescript
id: string (UUID)
invoiceData: Partial<InvoiceInsert>  // Can update any fields
items?: Array<{
  description: string
  quantity: number
  unit: string
  unit_price: number
  item_order?: number
}>
```

**Returns:** `Invoice` (updated invoice)

**Important Notes:**
- If items are provided, old items are deleted and replaced
- If items are not provided, existing items remain unchanged
- `invoice_number` can only be edited if status ≠ 'paid' && status ≠ 'cancelled'

**Example:**
```typescript
// Update invoice status and items
const updated = await updateInvoice(invoiceId, {
  status: 'sent',
  invoice_number: 'BL202600000002'
}, updatedItems)
```

---

#### `getInvoiceById(id)`
**Parameters:**
```typescript
id: string (UUID)
```

**Returns:**
```typescript
{
  invoice: Invoice,
  items: InvoiceItem[]
}
```

**Example:**
```typescript
const { invoice, items } = await getInvoiceById(invoiceId)
```

---

#### `getInvoices()`
**Parameters:** None

**Returns:** `Invoice[]` (ordered by created_at DESC)

**Example:**
```typescript
const allInvoices = await getInvoices()
```

---

#### `deleteInvoice(id)`
**Parameters:**
```typescript
id: string (UUID)
```

**Returns:** void

**Example:**
```typescript
await deleteInvoice(invoiceId)
```

---

#### `updateInvoiceStatus(id, status)`
**Parameters:**
```typescript
id: string (UUID)
status: 'draft' | 'sent' | 'paid' | 'cancelled'
```

**Returns:** `Invoice`

**Example:**
```typescript
const paid = await updateInvoiceStatus(invoiceId, 'paid')
```

---

### Customer Operations

#### `getCustomers()`
**Returns:** `Customer[]` (ordered by name ASC)

```typescript
interface Customer {
  id: string
  name: string
  address?: string
  tax_id?: string
  contact_name?: string
  phone?: string
  email?: string
  created_at: string
}
```

---

#### `createCustomer(customerData)`
**Parameters:**
```typescript
{
  name: string
  address?: string
  tax_id?: string
  contact_name?: string
  phone?: string
  email?: string
}
```

**Returns:** `Customer`

---

### Helper Functions

#### `calculateTotals(items, vatRate, withholdingRate)`
**Parameters:**
```typescript
items: Array<{ quantity: number, unit_price: number }>
vatRate: number (default: 7)   // In percent
withholdingRate: number (default: 3)  // In percent
```

**Returns:**
```typescript
{
  subtotal: number,
  vat_amount: number,
  withholding_tax_amount: number,
  total: number
}
```

**Example:**
```typescript
const totals = calculateTotals(
  [
    { quantity: 10, unit_price: 5000 },
    { quantity: 5, unit_price: 2000 }
  ],
  7,    // VAT 7%
  3     // Withholding 3%
)
// Returns:
// subtotal: 60000
// vat_amount: 4200
// withholding_tax_amount: 1800
// total: 62400
```

---

#### `numberToThaiWords(amount)`
**Parameters:**
```typescript
amount: number
```

**Returns:** `string` (Thai text representation)

**Examples:**
```typescript
numberToThaiWords(0)          // "ศูนย์บาทถ้วน"
numberToThaiWords(1)          // "หนึ่งบาทถ้วน"
numberToThaiWords(20)         // "ยี่สิบบาทถ้วน"
numberToThaiWords(100)        // "หนึ่งร้อยบาทถ้วน"
numberToThaiWords(1000)       // "หนึ่งพันบาทถ้วน"
numberToThaiWords(10000)      // "หนึ่งหมื่นบาทถ้วน"
numberToThaiWords(88920)      // "แปดหมื่นแปดพันเก้าร้อยยี่สิบบาทถ้วน"
numberToThaiWords(1234.50)    // "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์"
```

**Positional System (4-6 digits):**
```
100,000+ → แสน (hundred thousand)
10,000+  → หมื่น (ten thousand)
1,000+   → พัน (thousand)
100+     → ร้อย (hundred)
10+      → สิบ/ยี่สิบ (ten)
1-9      → ones array
```

---

#### `formatCurrency(amount)`
**Parameters:**
```typescript
amount: number
```

**Returns:** `string` (Thai currency format)

**Examples:**
```typescript
formatCurrency(1000)      // "1,000.00"
formatCurrency(1234.5)    // "1,234.50"
formatCurrency(1000000)   // "1,000,000.00"
```

---

#### `formatDate(dateStr)`
**Parameters:**
```typescript
dateStr: string (YYYY-MM-DD)
```

**Returns:** `string` (DD/MM/YYYY format)

**Examples:**
```typescript
formatDate('2026-03-02')  // "02/03/2026"
formatDate('2025-12-25')  // "25/12/2025"
```

---

### Invoice Number Generation

#### `generateInvoiceNumber()`
**Returns:** `string` (Format: BL{YYYY}{NNNNNN})

**Example Output:**
```
BL202600000001  (First invoice of 2026)
BL202600000002  (Second invoice of 2026)
BL202700000001  (First invoice of 2027)
```

**Auto-increment Logic:**
- Counts invoices created in current year
- Increments by 1
- Pads to 6 digits with leading zeros

---

## 🧪 Testing Examples

### Create Invoice Flow
```typescript
// 1. Load customers
const customers = await getCustomers()

// 2. Calculate totals
const items = [
  { description: 'Service A', quantity: 5, unit: 'วัน', unit_price: 10000 },
  { description: 'Service B', quantity: 2, unit: 'ชม', unit_price: 5000 }
]
const totals = calculateTotals(items, 7, 3)

// 3. Create invoice
const invoice = await createInvoice({
  invoice_date: '2026-03-02',
  due_date: '2026-04-02',
  seller_name: 'จิรายุ โพธิสาร',
  company_name: 'บริษัท ทอมแอนด์เฟรนด์เทคโนโลยี จำกัด',
  company_address: '...',
  company_tax_id: '0105559192600',
  company_phone: '08-5492-2469',
  company_website: 'www.tomandfriends.co',
  customer_name: 'บริษัท ออด-อี',
  ...totals,
  status: 'draft'
}, items)

// 4. Use invoice data
console.log(invoice.invoice_number)  // "BL202600000001"
console.log(invoice.id)  // UUID
```

### Update and Mark Paid Flow
```typescript
// 1. Load invoice
const { invoice, items } = await getInvoiceById(invoiceId)

// 2. Update details
const updated = await updateInvoice(invoiceId, {
  due_date: '2026-05-02',
  status: 'sent'
}, items)

// 3. Later: Mark as paid
const paid = await updateInvoiceStatus(invoiceId, 'paid')
```

---

## 📊 Data Model Relationships

```
invoices
├── id (PK)
├── invoice_number (UNIQUE)
├── customer_id (FK) → customers.id
└── Relationship: 1 to Many

invoice_items
├── id (PK)
├── invoice_id (FK) → invoices.id
└── Relationship: Many to 1

customers
├── id (PK)
└── Optional reference from invoices.customer_id
```

---

## ⚠️ Error Handling

### Common Errors

**Supabase Connection Error**
```typescript
try {
  const data = await getInvoices()
} catch (error) {
  console.error('Failed to load invoices:', error.message)
  // Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
}
```

**Unique Constraint Violation**
```typescript
// invoice_number must be unique
try {
  await createInvoice(data, items)
} catch (error) {
  if (error.code === '23505') {  // Unique violation
    console.error('Invoice number already exists')
  }
}
```

**Foreign Key Violation**
```typescript
// customer_id must reference existing customer
try {
  const invoice = await createInvoice({
    customer_id: 'invalid-uuid',
    ...
  }, items)
} catch (error) {
  if (error.code === '23503') {  // Foreign key violation
    console.error('Customer not found')
  }
}
```

---

## 🎯 Common Workflows

### Workflow 1: Create Invoice → Send → Mark Paid
```typescript
// 1. Create
const invoice = await createInvoice(formData, items)

// 2. View/Print
// User navigates to /invoices/{id}

// 3. Update to sent
await updateInvoiceStatus(invoice.id, 'sent')

// 4. Mark paid
await updateInvoiceStatus(invoice.id, 'paid')
```

### Workflow 2: Edit Draft Invoice
```typescript
// 1. Load
const { invoice, items } = await getInvoiceById(invoiceId)

// 2. Edit in form
const newItems = [...items]  // Modify

// 3. Save
await updateInvoice(invoiceId, {
  due_date: newDueDate,
  ...
}, newItems)
```

### Workflow 3: Search and Generate Report
```typescript
// 1. Get all invoices
const invoices = await getInvoices()

// 2. Filter and calculate
const paidTotal = invoices
  .filter(inv => inv.status === 'paid')
  .reduce((sum, inv) => sum + inv.total, 0)

// 3. Format and display
const formatted = formatCurrency(paidTotal)
```

---

## 🔍 Type Definitions Quick Reference

```typescript
// Full Invoice Type
interface Invoice {
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
  vat_amount: number
  withholding_tax_rate: number
  withholding_tax_amount: number
  total: number
  notes: string | null
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
}

// For Insert (excludes id, created_at, updated_at)
type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>

// Invoice Item Type
interface InvoiceItem {
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

// Customer Type
interface Customer {
  id: string
  name: string
  address: string | null
  tax_id: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  created_at: string
}
```

---

**Last Updated:** March 2, 2026  
**Version:** 0.1.0

