# Technical Developer Guide - Invoice System

## 🎯 Quick Start for Developers

### 1. Setup Environment
```bash
# Clone and install
git clone <repo>
cd invoice-system
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials
```

### 2. Database Setup
```bash
# Run schema.sql in Supabase SQL Editor
# - Creates tables: invoices, invoice_items, customers, companies
# - Creates functions: generate_invoice_number(), update_updated_at()
# - Enables RLS (Row Level Security)
```

### 3. Run Development Server
```bash
npm run dev
# Open http://localhost:3000
```

---

## 📚 Code Architecture

### File Structure Deep Dive

#### `/lib/api.ts` - Business Logic
```typescript
// Invoice CRUD
export async function createInvoice(invoiceData, items)
export async function updateInvoice(id, invoiceData, items)
export async function deleteInvoice(id)

// Read operations
export async function getInvoices()
export async function getInvoiceById(id)

// Utilities
export function calculateTotals(items, vatRate, withholdingRate)
export function numberToThaiWords(amount)
export function formatCurrency(amount)
export function formatDate(date)
```

**Key Implementation Details:**
- All functions use async/await
- Error handling via try-catch in components
- Supabase queries return raw data
- Type-safe via TypeScript interfaces

#### `/lib/supabase.ts` - Data Types
```typescript
// Main invoice type
export type Invoice = {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string | null
  subtotal: number
  vat_rate: number
  vat_amount: number
  withholding_tax_rate: number
  withholding_tax_amount: number
  total: number
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  // ... other fields
}

// For insert/update (excludes id, created_at, updated_at)
export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>
```

#### `/components/InvoiceForm.tsx` - Form Component
**State Management:**
```typescript
interface InvoiceFormData {
  invoice_number?: string      // Optional for new invoices
  invoice_date: string         // Required
  status: Invoice['status']    // Required
  // ... other fields
}

const canEditInvoiceNumber = !!invoice && 
  formData.status !== 'paid' && 
  formData.status !== 'cancelled'
```

**Key Functions:**
- `handleSave()` - Save invoice + items to database
- `handleCustomerSelect()` - Populate customer fields from selection
- `updateItem()` - Update line item at specific index
- `addItem()` / `removeItem()` - Manage dynamic line items

**Business Rules Applied:**
1. Auto-generate invoice_number for new invoices
2. Allow editing invoice_number only if status ≠ paid/cancelled
3. Calculate totals in real-time (VAT + Withholding Tax)
4. Validate required fields before save

#### `/components/InvoiceTemplate.tsx` - Display Template
**Render Modes:**
1. **Print Preview** - Inline styles, A4 dimensions
2. **PDF Export** - html2canvas captures with high DPI
3. **Browser Print** - Uses CSS print media queries

**Key Elements:**
```
Header (Company Info + Invoice Number)
├── Left: Company name, address, tax ID, contact
├── Right: Invoice number, date, due date, status
│
Customer Section
├── Name, address, tax ID, contact
│
Line Items Table
├── Description, Quantity, Unit, Unit Price, Total
│
Totals Section
├── Subtotal
├── VAT Amount
├── Withholding Tax Amount
└── Final Total (in Thai words)

Footer (Notes)
└── Payment terms, etc.
```

---

## 🔄 Data Flow Examples

### Creating a New Invoice

```
[InvoiceForm] 
  ↓ (user fills form + line items)
[handleSave()]
  ↓
{
  invoiceData: {
    invoice_date, due_date, seller_name, company_name,
    customer_name, vat_rate, withholding_tax_rate,
    subtotal, vat_amount, withholding_tax_amount, total,
    status: 'draft'
  },
  items: [
    { description, quantity, unit, unit_price, item_order: 1 },
    { description, quantity, unit, unit_price, item_order: 2 }
  ]
}
  ↓
[API: createInvoice()]
  ↓
1. generateInvoiceNumber() → "BL202600000001"
2. INSERT into invoices with invoice_number
3. INSERT into invoice_items (with item_order)
  ↓
[Redirect to /invoices/{id}]
```

### Updating an Existing Invoice

```
[InvoiceForm (edit mode)]
  ↓ (load existing invoice data)
[Display with editable fields]
  ↓ (user modifies fields/items)
[handleSave()]
  ↓
{
  invoiceData: { ...updated fields, invoice_number (if editable) },
  items: [ ...updated items with item_order ]
}
  ↓
[API: updateInvoice(id, invoiceData, items)]
  ↓
1. UPDATE invoices SET { ...invoiceData }
2. DELETE FROM invoice_items WHERE invoice_id = id
3. INSERT new invoice_items
  ↓
[Redirect to /invoices/{id}]
```

### Calculating Totals

```
[User enters quantity + unit_price for each item]
  ↓
[calculateTotals(items, vat_rate, withholding_rate)]
  ↓
subtotal = Σ(quantity × unit_price)
vat_amount = subtotal × (vat_rate / 100)
withholding_tax_amount = subtotal × (withholding_tax_rate / 100)
total = subtotal + vat_amount - withholding_tax_amount
  ↓
[Update display in real-time]
```

---

## 🛡️ Validation Rules

### Invoice Validation
```typescript
// Required fields
invoice_date: required (date)
customer_name: required (string)
company_name: required (string)
seller_name: required (string)

// Auto-generated or manual
invoice_number: auto-generated (new) or editable (draft/sent only)

// Items validation
items.length >= 1 (at least one item)
items[].description: required
items[].quantity: >= 0
items[].unit_price: >= 0

// Status rules
status ∈ ['draft', 'sent', 'paid', 'cancelled']
invoice_number editable ↔ status ∉ ['paid', 'cancelled']
```

### Calculation Validation
```typescript
subtotal >= 0
vat_rate: 0-100 (default: 7)
withholding_tax_rate: 0-100 (default: 3)
vat_amount = subtotal × (vat_rate / 100)
withholding_tax_amount = subtotal × (withholding_tax_rate / 100)
total = subtotal + vat_amount - withholding_tax_amount
```

---

## 🧮 Helper Functions Explained

### `numberToThaiWords(amount: number): string`
**Purpose:** Convert amount to Thai text representation for invoice printing

**Algorithm:**
```
1. Split into integer and decimal parts
2. Convert integer using positional system:
   - If < 1,000,000: break into hundreds_thousands, ten_thousands, thousands, hundreds, tens, ones
   - Each position uses: ones array + position name (แสน/หมื่น/พัน/ร้อย)
   - Tens: special handling for "สิบ" (10) and "ยี่สิบ" (20)
3. Convert decimal to "สตางค์"
4. Append "บาทถ้วน" for round amounts

Example: 88920
  = 8 (ten thousands) + 8 (thousands) + 9 (hundreds) + 2 (tens) + 0 (ones)
  = "แปด" + "หมื่น" + "แปด" + "พัน" + "เก้า" + "ร้อย" + "ยี่สิบ" + "บาทถ้วน"
  = "แปดหมื่นแปดพันเก้าร้อยยี่สิบบาทถ้วน"
```

### `calculateTotals(items, vatRate, withholdingRate)`
**Returns:** `{ subtotal, vat_amount, withholding_tax_amount, total }`

**Key Points:**
- Withholding tax calculated from subtotal (before VAT)
- Final total = subtotal + VAT - withholding tax
- All values rounded to 2 decimal places

### `formatCurrency(amount: number): string`
**Uses:** `Intl.NumberFormat` with Thai locale
**Output:** "1,234.56" format with thousand separators

### `formatDate(date: string): string`
**Input:** ISO format "YYYY-MM-DD"
**Output:** Thai format "DD/MM/YYYY"

---

## 🐛 Debugging Tips

### Check Invoice Creation Issues
```typescript
// In browser console
const { data, error } = await supabase
  .from('invoices')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()

console.log(data, error)
```

### Check Generated Invoice Number
```typescript
const { data } = await supabase
  .rpc('generate_invoice_number')
console.log(data)  // Should be "BL202600000001" format
```

### Verify Line Items Association
```typescript
const { data } = await supabase
  .from('invoice_items')
  .select('*')
  .eq('invoice_id', '<invoice-id>')
  .order('item_order', { ascending: true })
console.log(data)
```

### Test Thai Words Conversion
```typescript
import { numberToThaiWords } from '@/lib/api'
console.log(numberToThaiWords(88920))
// Expected: "แปดหมื่นแปดพันเก้าร้อยยี่สิบบาทถ้วน"
```

---

## 📊 Database Queries Reference

### Get all invoices with stats
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(total) as total_amount,
  MAX(created_at) as latest_date
FROM invoices
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY status
```

### Get invoice with all items
```sql
SELECT 
  i.*,
  json_agg(
    json_build_object(
      'id', ii.id,
      'description', ii.description,
      'quantity', ii.quantity,
      'unit_price', ii.unit_price,
      'total', ii.total
    ) ORDER BY ii.item_order
  ) as items
FROM invoices i
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE i.id = '<invoice-id>'
GROUP BY i.id
```

---

## 🔐 Security Considerations

### Current State
- RLS (Row Level Security) enabled but permissive ("Allow all")
- No authentication implemented
- All API calls use anon key

### For Production
```sql
-- Replace "Allow all" policies with:
CREATE POLICY "Users can view own invoices" ON invoices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices" ON invoices
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Required Changes
1. Add user_id column to invoices table
2. Implement Supabase Auth
3. Add authentication checks in API functions
4. Use authenticated client instead of anon key

---

## 📈 Performance Optimization

### Current Bottlenecks
1. **PDF Export** - html2canvas scans entire page (4x scale = high memory)
   - Solution: Render only one page at a time
2. **Invoice List** - No pagination
   - Solution: Add limit/offset or infinite scroll
3. **Customer Selection** - Loads all customers
   - Solution: Add search/filter via API

### Potential Improvements
```typescript
// Use server components for data fetching
// Implement React Query for caching
// Add pagination to invoice list
// Lazy load PDF generation
// Use image optimization for invoices
```

---

## 🚀 Deployment Checklist

- [ ] Set .env.local in production
- [ ] Run database schema.sql in production Supabase
- [ ] Enable proper RLS policies
- [ ] Set up authentication
- [ ] Add error monitoring (Sentry)
- [ ] Configure email service (SendGrid, Resend)
- [ ] Add rate limiting to API routes
- [ ] Set up backups
- [ ] Test PDF export quality
- [ ] Configure CDN for assets

---

## 🧪 Testing

### Test Setup

The project uses **Vitest** + **React Testing Library** for unit and integration tests.

**Test Configuration:**
```typescript
// vitest.config.ts
- Environment: jsdom
- Setup: tests/setup.ts (mocks Next.js router, window APIs)
- Alias: @supabase/supabase-js → tests/mocks/supabase-js.ts
```

**Mock Strategy:**
- Next.js navigation mocked in setup
- Supabase client aliased to lightweight test mock
- window.confirm, window.alert, window.print stubbed

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch
```

### Test Coverage

**1. Helper Functions (`tests/lib/api.test.ts`)**
- ✅ `calculateTotals()` - VAT + withholding tax math
- ✅ `numberToThaiWords()` - Zero, decimals, large numbers
- ✅ `formatCurrency()` - Thai number format
- ✅ `formatDate()` - Thai Buddhist calendar

**2. Data Access (`tests/lib/api.test.ts`)**
- ✅ `getInvoices()` - Fetch and order by date
- ✅ `getInvoiceById()` - Fetch invoice + items
- ✅ `generateInvoiceNumber()` - Yearly sequence
- ✅ `createInvoice()` - Insert invoice + items
- ✅ `updateInvoice()` - Update + replace items
- ✅ `deleteInvoice()` - Remove invoice
- ✅ `updateInvoiceStatus()` - Change status
- ✅ `getCustomers()` / `createCustomer()` - Customer CRUD

**3. Components (`tests/components/`)**
- ✅ **InvoiceForm.test.tsx**
  - Add/remove line items
  - Recalculate totals on input change
  - Submit new invoice and redirect
- ✅ **InvoiceTemplate.test.tsx**
  - Render invoice details
  - Display totals and Thai words
  - Show copy label and page number

**4. Pages (`tests/pages/`)**
- ✅ **home.test.tsx**
  - Render invoice list from API
  - Delete invoice with confirmation
- ✅ **invoice-view.test.tsx**
  - Load invoice data
  - Mark as paid
- ✅ **invoice-edit.test.tsx**
  - Load invoice for editing
  - Display invoice number in header

### Writing New Tests

**Example: Testing a Helper Function**
```typescript
import { describe, expect, it } from 'vitest'
import { calculateTotals } from '@/lib/api'

describe('calculateTotals', () => {
  it('applies VAT and withholding correctly', () => {
    const result = calculateTotals(
      [{ quantity: 2, unit_price: 100 }],
      7,  // VAT rate
      3   // Withholding rate
    )
    
    expect(result.subtotal).toBe(200)
    expect(result.vat_amount).toBeCloseTo(14)
    expect(result.withholding_tax_amount).toBeCloseTo(6)
    expect(result.total).toBeCloseTo(208)
  })
})
```

**Example: Testing a Component**
```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const mockGetCustomers = vi.fn()
vi.mock('@/lib/api', () => ({
  getCustomers: mockGetCustomers,
}))

describe('MyComponent', () => {
  it('loads data on mount', async () => {
    mockGetCustomers.mockResolvedValue([{ id: '1', name: 'Test' }])
    
    render(<MyComponent />)
    
    expect(await screen.findByText('Test')).toBeInTheDocument()
  })
})
```

### Test Best Practices

1. **Arrange-Act-Assert Pattern**
   ```typescript
   // Arrange: Set up test data and mocks
   const mockData = { id: '1' }
   mockGetData.mockResolvedValue(mockData)
   
   // Act: Perform the action
   render(<Component />)
   await userEvent.click(screen.getByRole('button'))
   
   // Assert: Verify the outcome
   expect(mockGetData).toHaveBeenCalled()
   ```

2. **Use Semantic Queries**
   - Prefer `getByRole`, `getByLabelText`, `getByText` over `getByTestId`
   - Query by what users see, not implementation details

3. **Handle Async Operations**
   ```typescript
   // Wait for element to appear
   expect(await screen.findByText('Loaded')).toBeInTheDocument()
   
   // Wait for assertion
   await waitFor(() => {
     expect(mockFn).toHaveBeenCalled()
   })
   ```

4. **Mock External Dependencies**
   - Mock API calls to avoid real network requests
   - Mock navigation to avoid router errors
   - Stub browser APIs (window.print, window.confirm)

5. **Test User Behavior, Not Implementation**
   ```typescript
   // ❌ Bad: Testing implementation
   expect(component.state.count).toBe(1)
   
   // ✅ Good: Testing user-visible behavior
   expect(screen.getByText('Count: 1')).toBeInTheDocument()
   ```

### Known Test Warnings

- React `act(...)` warnings appear for some async state updates
- These are cosmetic and don't affect test functionality
- All 20 tests pass successfully

---

## 🚀 Deployment Checklist

- [ ] Set .env.local in production
- [ ] Run database schema.sql in production Supabase
- [ ] Enable proper RLS policies
- [ ] Set up authentication
- [ ] Add error monitoring (Sentry)
- [ ] Configure email service (SendGrid, Resend)
- [ ] Add rate limiting to API routes
- [ ] Set up backups
- [ ] Test PDF export quality
- [ ] Configure CDN for assets

---

## 📞 Support & Troubleshooting

### Common Issues

**Q: Invoice number already exists?**
- A: Invoice numbers must be unique. Check if updating triggers new generation.

**Q: PDF export shows blank pages?**
- A: Ensure html2canvas can access DOM. Check CSS, especially position: absolute elements.

**Q: Supabase connection error?**
- A: Verify NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local

**Q: Thai text not displaying?**
- A: Ensure Sarabun font is available. Add @import in globals.css if needed.

---

## 🔗 Useful Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [html2canvas](https://html2canvas.hertzen.com/)
- [jsPDF Documentation](https://github.com/parallax/jsPDF)

---

**Last Updated:** March 2, 2026  
**For:** Invoice System v0.1.0

