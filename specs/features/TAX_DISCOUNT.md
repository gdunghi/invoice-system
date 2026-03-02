# 💰 Tax & Discount Feature

## Overview
ระบบคำนวณภาษีและส่วนลดที่ยืดหยุ่น รองรับ VAT, Withholding Tax, และส่วนลดหลายรูปแบบ

---

## 🎯 Business Goals

### Primary Goals
1. คำนวณ VAT 7% อัตโนมัติ
2. รองรับหักภาษี ณ ที่จ่าย (1%, 3%, 5%)
3. ส่วนลดแบบ % หรือจำนวนเงิน
4. แสดงรายละเอียดการคำนวณที่ชัดเจน
5. รองรับ Tax Invoice และ Receipt

### Tax Compliance (สำคัญ!)
- ✅ ตรงตามกฎหมายภาษีไทย
- ✅ บันทึก Tax ID ทั้งผู้ขายและผู้ซื้อ
- ✅ เก็บ audit trail การคำนวณภาษี

---

## 📋 Requirements

### Tax Types (ประเภทภาษี)

#### 1. VAT (ภาษีมูลค่าเพิ่ม)
```
Rate: 7% (default, configurable)
Calculation: Subtotal × 7%
Display: "+VAT 7%"
```

#### 2. Withholding Tax (หักภาษี ณ ที่จ่าย)
```
Rates: 1%, 3%, 5% (user selectable)
Calculation: Subtotal × rate%
Display: "-WHT 3%"

Common Cases:
- 1%: ค่าโฆษณา, ค่าขนส่ง
- 3%: ค่าบริการทั่วไป, ค่าเช่า
- 5%: ค่าวิชาชีพ, ค่าที่ปรึกษา
```

#### 3. Discount (ส่วนลด)
```
Types:
- Percentage: 10%, 20%, etc.
- Fixed Amount: ฿1,000, ฿5,000, etc.

Applied:
- Before VAT
- Can apply per item or total

Display: "-Discount 10%"
```

---

## 🧮 Calculation Logic

### Formula Breakdown

```typescript
// Current (ระบบเดิม)
Subtotal = Σ(item.quantity × item.unit_price)
VAT = Subtotal × 7%
WHT = Subtotal × 3%
Total = Subtotal + VAT - WHT

// New (ระบบใหม่ + Discount)
Item Total = quantity × unit_price - item_discount
Subtotal = Σ(Item Total)
After Discount = Subtotal - invoice_discount
VAT = After Discount × vat_rate%
WHT = After Discount × wht_rate%
Grand Total = After Discount + VAT - WHT
```

### Example Calculations

#### Example 1: Basic VAT + WHT
```
Item 1: 2 × ฿1,000 = ฿2,000
Item 2: 1 × ฿500  = ฿500
─────────────────────────────
Subtotal:           ฿2,500
VAT 7%:            +฿175
WHT 3%:            -฿75
─────────────────────────────
Grand Total:        ฿2,600
```

#### Example 2: With Item Discount
```
Item 1: 2 × ฿1,000 = ฿2,000
  Discount 10%:     -฿200
  Item Total:        ฿1,800

Item 2: 1 × ฿500  = ฿500
─────────────────────────────
Subtotal:           ฿2,300
VAT 7%:            +฿161
WHT 3%:            -฿69
─────────────────────────────
Grand Total:        ฿2,392
```

#### Example 3: With Invoice Discount
```
Item 1: 2 × ฿1,000 = ฿2,000
Item 2: 1 × ฿500  = ฿500
─────────────────────────────
Subtotal:           ฿2,500
Discount 15%:      -฿375
─────────────────────────────
After Discount:     ฿2,125
VAT 7%:            +฿148.75
WHT 3%:            -฿63.75
─────────────────────────────
Grand Total:        ฿2,210
```

---

## 🗄️ Database Changes

### Modify Existing Tables

```sql
-- Add discount fields to invoices table
ALTER TABLE invoices ADD COLUMN discount_type VARCHAR(20); -- 'percentage' or 'amount'
ALTER TABLE invoices ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN subtotal_before_discount NUMERIC(10,2);

-- Add discount fields to invoice_items table
ALTER TABLE invoice_items ADD COLUMN discount_type VARCHAR(20);
ALTER TABLE invoice_items ADD COLUMN discount_value NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN discount_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE invoice_items ADD COLUMN subtotal_before_discount NUMERIC(10,2);

-- Add tax configuration
ALTER TABLE invoices ADD COLUMN vat_type VARCHAR(20) DEFAULT 'included'; -- 'included' or 'excluded'
ALTER TABLE invoices ADD COLUMN is_tax_invoice BOOLEAN DEFAULT false;

-- Update calculation fields (already exist, just document)
-- vat_rate (already exists)
-- vat_amount (already exists)
-- withholding_tax_rate (already exists)
-- withholding_tax_amount (already exists)
```

### New Tax Settings Table (Optional)

```sql
CREATE TABLE tax_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  vat_rate NUMERIC(5,2) DEFAULT 7.00,
  wht_rates JSONB DEFAULT '[1, 3, 5]',
  default_wht_rate NUMERIC(5,2) DEFAULT 3.00,
  auto_calculate_vat BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎨 UI/UX Design

### 1. Invoice Form - Tax & Discount Section

```
┌─────────────────────────────────────────────────┐
│  Line Items                                      │
│  ┌───────────────────────────────────────────┐  │
│  │ Description | Qty | Price | Disc | Total │  │
│  ├───────────────────────────────────────────┤  │
│  │ Service A   | 2   | 1,000 | 10%  | 1,800 │  │
│  │ Service B   | 1   | 500   | 0    | 500   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Tax & Discount Settings                        │
│  ┌───────────────────────────────────────────┐  │
│  │ Invoice Discount                          │  │
│  │ Type: [Percentage ▼] Value: [15] %       │  │
│  │                                           │  │
│  │ VAT (Value Added Tax)                     │  │
│  │ ☑ Include VAT  Rate: [7] %               │  │
│  │                                           │  │
│  │ Withholding Tax                           │  │
│  │ ☑ Include WHT  Rate: [3 ▼] %             │  │
│  │   Options: 1%, 3%, 5%                     │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  Summary                                         │
│  ┌───────────────────────────────────────────┐  │
│  │ Subtotal:              ฿2,300.00          │  │
│  │ Discount (15%):       -฿345.00            │  │
│  │ ─────────────────────────────────────     │  │
│  │ After Discount:        ฿1,955.00          │  │
│  │ VAT 7%:               +฿136.85            │  │
│  │ WHT 3%:               -฿58.65             │  │
│  │ ─────────────────────────────────────     │  │
│  │ Grand Total:           ฿2,033.20          │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2. Invoice Display - Tax Breakdown

```
┌─────────────────────────────────────────────────┐
│  Invoice #INV-2024-001                          │
│                                                  │
│  Items:                                          │
│  1. Service A    2 × ฿1,000  -10%   = ฿1,800   │
│  2. Service B    1 × ฿500            = ฿500     │
│                                      ────────    │
│                            Subtotal:  ฿2,300    │
│                    Discount (15%):   -฿345      │
│                                      ────────    │
│                      After Discount:  ฿1,955    │
│                                                  │
│  Tax Calculation:                                │
│  VAT 7% (on ฿1,955):                +฿136.85    │
│  WHT 3% (on ฿1,955):                -฿58.65     │
│                                      ────────    │
│                          Grand Total: ฿2,033.20 │
│                                                  │
│  [ภาษีมูลค่าเพิ่ม/Tax Invoice]                  │
└─────────────────────────────────────────────────┘
```

---

## 🔌 API Changes

### Update calculateTotals Function

```typescript
// lib/api.ts
export interface CalculationResult {
  subtotal: number
  discount_amount: number
  subtotal_after_discount: number
  vat_amount: number
  withholding_tax_amount: number
  grand_total: number
  breakdown: {
    items: Array<{
      id: string
      subtotal: number
      discount: number
      total: number
    }>
  }
}

export function calculateTotals(
  items: Array<{
    quantity: number
    unit_price: number
    discount_type?: 'percentage' | 'amount'
    discount_value?: number
  }>,
  invoiceDiscount: {
    type?: 'percentage' | 'amount'
    value?: number
  } = {},
  vatRate: number = 7,
  withholdingRate: number = 3,
  options: {
    includeVat?: boolean
    includeWht?: boolean
  } = {}
): CalculationResult {
  
  // 1. Calculate item totals with discounts
  const itemsWithTotals = items.map(item => {
    const itemSubtotal = item.quantity * item.unit_price
    let itemDiscount = 0
    
    if (item.discount_type === 'percentage') {
      itemDiscount = itemSubtotal * (item.discount_value || 0) / 100
    } else if (item.discount_type === 'amount') {
      itemDiscount = item.discount_value || 0
    }
    
    return {
      ...item,
      subtotal: itemSubtotal,
      discount: itemDiscount,
      total: itemSubtotal - itemDiscount
    }
  })
  
  // 2. Calculate subtotal
  const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0)
  
  // 3. Apply invoice discount
  let invoiceDiscountAmount = 0
  if (invoiceDiscount.type === 'percentage') {
    invoiceDiscountAmount = subtotal * (invoiceDiscount.value || 0) / 100
  } else if (invoiceDiscount.type === 'amount') {
    invoiceDiscountAmount = invoiceDiscount.value || 0
  }
  
  const subtotalAfterDiscount = subtotal - invoiceDiscountAmount
  
  // 4. Calculate taxes
  const vatAmount = options.includeVat !== false 
    ? subtotalAfterDiscount * (vatRate / 100) 
    : 0
    
  const withholdingTaxAmount = options.includeWht !== false
    ? subtotalAfterDiscount * (withholdingRate / 100)
    : 0
  
  // 5. Calculate grand total
  const grandTotal = subtotalAfterDiscount + vatAmount - withholdingTaxAmount
  
  return {
    subtotal,
    discount_amount: invoiceDiscountAmount,
    subtotal_after_discount: subtotalAfterDiscount,
    vat_amount: vatAmount,
    withholding_tax_amount: withholdingTaxAmount,
    grand_total: grandTotal,
    breakdown: {
      items: itemsWithTotals
    }
  }
}
```

### API Response Example

```typescript
// POST /api/invoices/calculate
Request: {
  items: [
    { quantity: 2, unit_price: 1000, discount_type: 'percentage', discount_value: 10 },
    { quantity: 1, unit_price: 500 }
  ],
  invoice_discount: { type: 'percentage', value: 15 },
  vat_rate: 7,
  withholding_rate: 3
}

Response: {
  subtotal: 2300,
  discount_amount: 345,
  subtotal_after_discount: 1955,
  vat_amount: 136.85,
  withholding_tax_amount: 58.65,
  grand_total: 2033.20,
  breakdown: {
    items: [
      { subtotal: 2000, discount: 200, total: 1800 },
      { subtotal: 500, discount: 0, total: 500 }
    ]
  }
}
```

---

## 📦 Implementation Steps

### Phase 1: Database & Backend (Week 1)

#### Step 1.1: Update Database Schema
```bash
# Run migration
psql -d invoice_db -f supabase/migrations/add_tax_discount_fields.sql
```

#### Step 1.2: Update calculateTotals Function
```typescript
// lib/api.ts - เพิ่ม function ใหม่
export function calculateTotals(items, invoiceDiscount, vatRate, withholdingRate, options) {
  // ... implementation above
}
```

#### Step 1.3: Add Calculation API
```typescript
// app/api/invoices/calculate/route.ts
export async function POST(req: Request) {
  const body = await req.json()
  const result = calculateTotals(
    body.items,
    body.invoice_discount,
    body.vat_rate,
    body.withholding_rate,
    body.options
  )
  return Response.json(result)
}
```

### Phase 2: UI Components (Week 2)

#### Step 2.1: Create Discount Input Component
```typescript
// components/DiscountInput.tsx
interface DiscountInputProps {
  type: 'percentage' | 'amount'
  value: number
  onTypeChange: (type: 'percentage' | 'amount') => void
  onValueChange: (value: number) => void
}

export default function DiscountInput({ type, value, onTypeChange, onValueChange }: DiscountInputProps) {
  return (
    <div className="flex gap-2">
      <select value={type} onChange={e => onTypeChange(e.target.value as any)}>
        <option value="percentage">Percentage (%)</option>
        <option value="amount">Amount (฿)</option>
      </select>
      <input
        type="number"
        value={value}
        onChange={e => onValueChange(Number(e.target.value))}
        min="0"
        step={type === 'percentage' ? '1' : '0.01'}
      />
      {type === 'percentage' && <span>%</span>}
    </div>
  )
}
```

#### Step 2.2: Create Tax Settings Component
```typescript
// components/TaxSettings.tsx
export default function TaxSettings({
  includeVat,
  vatRate,
  includeWht,
  whtRate,
  onChange
}) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
      <h3 className="font-semibold">Tax Settings</h3>
      
      {/* VAT */}
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={includeVat}
          onChange={e => onChange({ includeVat: e.target.checked })}
        />
        <label>Include VAT</label>
        <input
          type="number"
          value={vatRate}
          onChange={e => onChange({ vatRate: Number(e.target.value) })}
          disabled={!includeVat}
          className="w-20"
        />
        <span>%</span>
      </div>
      
      {/* WHT */}
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={includeWht}
          onChange={e => onChange({ includeWht: e.target.checked })}
        />
        <label>Include Withholding Tax</label>
        <select
          value={whtRate}
          onChange={e => onChange({ whtRate: Number(e.target.value) })}
          disabled={!includeWht}
        >
          <option value="1">1%</option>
          <option value="3">3%</option>
          <option value="5">5%</option>
        </select>
      </div>
    </div>
  )
}
```

#### Step 2.3: Update InvoiceForm
```typescript
// components/InvoiceForm.tsx
export default function InvoiceForm({ invoice, items }: InvoiceFormProps) {
  const [itemsList, setItemsList] = useState(items)
  const [invoiceDiscount, setInvoiceDiscount] = useState({
    type: 'percentage',
    value: 0
  })
  const [taxSettings, setTaxSettings] = useState({
    includeVat: true,
    vatRate: 7,
    includeWht: true,
    whtRate: 3
  })
  
  // Recalculate on change
  useEffect(() => {
    const result = calculateTotals(
      itemsList,
      invoiceDiscount,
      taxSettings.vatRate,
      taxSettings.whtRate,
      {
        includeVat: taxSettings.includeVat,
        includeWht: taxSettings.includeWht
      }
    )
    setTotals(result)
  }, [itemsList, invoiceDiscount, taxSettings])
  
  return (
    <form>
      {/* Items */}
      <ItemsTable
        items={itemsList}
        onChange={setItemsList}
      />
      
      {/* Invoice Discount */}
      <DiscountInput
        type={invoiceDiscount.type}
        value={invoiceDiscount.value}
        onTypeChange={type => setInvoiceDiscount(prev => ({ ...prev, type }))}
        onValueChange={value => setInvoiceDiscount(prev => ({ ...prev, value }))}
      />
      
      {/* Tax Settings */}
      <TaxSettings
        {...taxSettings}
        onChange={changes => setTaxSettings(prev => ({ ...prev, ...changes }))}
      />
      
      {/* Summary */}
      <InvoiceSummary totals={totals} />
    </form>
  )
}
```

#### Step 2.4: Create Invoice Summary Component
```typescript
// components/InvoiceSummary.tsx
export default function InvoiceSummary({ totals }: { totals: CalculationResult }) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
        </div>
        
        {totals.discount_amount > 0 && (
          <div className="flex justify-between text-red-600">
            <span>Discount:</span>
            <span>-{formatCurrency(totals.discount_amount)}</span>
          </div>
        )}
        
        <div className="border-t pt-2" />
        
        <div className="flex justify-between">
          <span>After Discount:</span>
          <span className="font-medium">{formatCurrency(totals.subtotal_after_discount)}</span>
        </div>
        
        {totals.vat_amount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>VAT 7%:</span>
            <span>+{formatCurrency(totals.vat_amount)}</span>
          </div>
        )}
        
        {totals.withholding_tax_amount > 0 && (
          <div className="flex justify-between text-orange-600">
            <span>WHT 3%:</span>
            <span>-{formatCurrency(totals.withholding_tax_amount)}</span>
          </div>
        )}
        
        <div className="border-t pt-2" />
        
        <div className="flex justify-between text-lg font-bold">
          <span>Grand Total:</span>
          <span className="text-[#7B5EA7]">{formatCurrency(totals.grand_total)}</span>
        </div>
      </div>
    </div>
  )
}
```

### Phase 3: Testing (Week 3)

```typescript
// tests/features/tax-discount.test.ts
describe('Tax & Discount Calculations', () => {
  it('should calculate item discount correctly', () => {
    const items = [
      { quantity: 2, unit_price: 1000, discount_type: 'percentage', discount_value: 10 }
    ]
    const result = calculateTotals(items, {}, 0, 0, { includeVat: false, includeWht: false })
    
    expect(result.subtotal).toBe(1800) // 2000 - 200 (10% discount)
  })
  
  it('should calculate invoice discount correctly', () => {
    const items = [{ quantity: 1, unit_price: 1000 }]
    const discount = { type: 'percentage', value: 15 }
    const result = calculateTotals(items, discount, 0, 0, { includeVat: false, includeWht: false })
    
    expect(result.subtotal).toBe(1000)
    expect(result.discount_amount).toBe(150)
    expect(result.subtotal_after_discount).toBe(850)
  })
  
  it('should calculate VAT after discount', () => {
    const items = [{ quantity: 1, unit_price: 1000 }]
    const discount = { type: 'amount', value: 100 }
    const result = calculateTotals(items, discount, 7, 0, { includeVat: true, includeWht: false })
    
    expect(result.subtotal_after_discount).toBe(900)
    expect(result.vat_amount).toBe(63) // 7% of 900
    expect(result.grand_total).toBe(963)
  })
  
  it('should calculate complete scenario', () => {
    const items = [
      { quantity: 2, unit_price: 1000, discount_type: 'percentage', discount_value: 10 },
      { quantity: 1, unit_price: 500 }
    ]
    const discount = { type: 'percentage', value: 15 }
    const result = calculateTotals(items, discount, 7, 3)
    
    expect(result.subtotal).toBe(2300)
    expect(result.discount_amount).toBe(345)
    expect(result.subtotal_after_discount).toBe(1955)
    expect(result.vat_amount).toBeCloseTo(136.85)
    expect(result.withholding_tax_amount).toBeCloseTo(58.65)
    expect(result.grand_total).toBeCloseTo(2033.20)
  })
})
```

---

## 🚨 Edge Cases & Validation

### 1. Discount Validation
```typescript
// Validate discount doesn't exceed subtotal
if (discount.type === 'amount' && discount.value > subtotal) {
  throw new Error('Discount amount cannot exceed subtotal')
}

if (discount.type === 'percentage' && discount.value > 100) {
  throw new Error('Discount percentage cannot exceed 100%')
}
```

### 2. Negative Totals
```typescript
// Ensure grand total is not negative
if (grandTotal < 0) {
  throw new Error('Invalid calculation: Grand total cannot be negative')
}
```

### 3. Rounding Issues
```typescript
// Always round to 2 decimal places
const roundTo2 = (num: number) => Math.round(num * 100) / 100

return {
  subtotal: roundTo2(subtotal),
  vat_amount: roundTo2(vatAmount),
  grand_total: roundTo2(grandTotal)
}
```

---

## 📊 Success Metrics

### Technical KPIs
- Calculation accuracy: 100% (no rounding errors)
- Calculation time: < 50ms
- API response time: < 100ms

### Business KPIs
- % of invoices using discount feature
- Average discount amount
- Most common WHT rate used
- Tax compliance rate

---

## 🚀 Future Enhancements

### Phase 4: Advanced Features
- [ ] Multiple tax rates per item (different VAT rates)
- [ ] Tax exemption rules
- [ ] Discount codes/coupons
- [ ] Bulk discount rules (buy X get Y% off)
- [ ] Early payment discount
- [ ] Loyalty discount
- [ ] Tax report export (for filing)
- [ ] Tax ID validation (check กรมสรรพากร)

---

**Last Updated:** March 2, 2026  
**Status:** 📝 Planning  
**Priority:** High  
**Estimated Effort:** 3 weeks  
**Tax Compliance:** ⚠️ ต้องตรวจสอบกับนักบัญชี

