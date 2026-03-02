# Invoice System - ระบบจัดการใบแจ้งหนี้

## 📋 บทสรุป (Overview)

ระบบจัดการใบแจ้งหนี้ (Invoice System) เป็นแอปพลิเคชันสำหรับสร้าง แก้ไข ดู และส่งออก PDF ของใบแจ้งหนี้ (Invoice) 
สำหรับบริษัท **ทอมแอนด์เฟรนด์เทคโนโลยี (Tom and Friends Technology Co., Ltd.)**

**สาขาทางธุรกิจ:** บริษัทเทคโนโลยี  
**ผู้ใช้หลัก:** พนักงานฝ่ายบัญชี/ขาย  
**ภาษา:** ภาษาไทย

---

## 🏗️ สถาปัตยกรรมระบบ (Architecture)

### Stack เทคโนโลยี
- **Frontend:** React 18 + Next.js 14.2 + TypeScript
- **Styling:** Tailwind CSS 3.4
- **Database:** Supabase (PostgreSQL)
- **PDF Export:** html2canvas + jsPDF
- **Icons:** Lucide React
- **UI Components:** Custom (built-in)

### โครงสร้างไฟล์
```
/app                      # Next.js App Router pages
  /page.tsx             # หน้าแรก - รายการ Invoice ทั้งหมด
  /invoices/
    /new/page.tsx       # สร้าง Invoice ใหม่
    /[id]/page.tsx      # ดู Invoice (ต้นฉบับ + สำเนา)
    /[id]/edit/page.tsx # แก้ไข Invoice

/components
  /InvoiceForm.tsx      # Form สำหรับสร้าง/แก้ไข Invoice
  /InvoiceTemplate.tsx  # Template HTML สำหรับพิมพ์ + PDF

/lib
  /api.ts               # API functions (CRUD + helpers)
  /supabase.ts          # Supabase client + TypeScript types

/supabase
  /schema.sql           # Database schema

/specs                  # Documentation
```

---

## 💾 ฐานข้อมูล (Database)

### ตารางหลัก

#### 1. **invoices** - ใบแจ้งหนี้
```sql
- id (UUID) - Primary Key
- invoice_number (TEXT, UNIQUE) - เลขที่ Invoice (BL{ปี}{ลำดับ})
- invoice_date (DATE) - วันที่ออก Invoice
- due_date (DATE) - วันครบกำหนด
- seller_name (TEXT) - ชื่อผู้ขาย
- company_name (TEXT) - ชื่อบริษัท
- company_address (TEXT) - ที่อยู่บริษัท
- company_tax_id (TEXT) - เลขประจำตัวผู้เสียภาษีบริษัท
- company_phone (TEXT) - เบอร์โทรบริษัท
- company_website (TEXT) - เว็บไซต์บริษัท
- customer_id (UUID) - FK ไปยัง customers
- customer_name (TEXT) - ชื่อลูกค้า
- customer_address (TEXT) - ที่อยู่ลูกค้า
- customer_tax_id (TEXT) - เลขประจำตัวผู้เสียภาษีลูกค้า
- contact_name (TEXT) - ชื่อผู้ติดต่อ
- contact_phone (TEXT) - เบอร์โทรผู้ติดต่อ
- contact_email (TEXT) - อีเมลผู้ติดต่อ
- subtotal (NUMERIC) - ยอดรวมก่อน VAT/หัก ณ ที่จ่าย
- vat_rate (NUMERIC) - อัตราภาษีมูลค่าเพิ่ม (%)
- vat_amount (NUMERIC) - จำนวนภาษีมูลค่าเพิ่ม
- withholding_tax_rate (NUMERIC) - อัตราหัก ณ ที่จ่าย (%)
- withholding_tax_amount (NUMERIC) - จำนวนหัก ณ ที่จ่าย
- total (NUMERIC) - ยอดรวมสุดท้าย
- notes (TEXT) - หมายเหตุ
- status (TEXT) - 'draft' | 'sent' | 'paid' | 'cancelled'
- created_at (TIMESTAMPTZ) - วันที่สร้าง
- updated_at (TIMESTAMPTZ) - วันที่อัปเดต
```

#### 2. **invoice_items** - รายการสินค้า/บริการ
```sql
- id (UUID) - Primary Key
- invoice_id (UUID) - FK ไปยัง invoices (CASCADE DELETE)
- item_order (INT) - ลำดับของรายการ
- description (TEXT) - รายละเอียด สินค้า/บริการ
- quantity (NUMERIC) - จำนวน
- unit (TEXT) - หน่วยนับ (วัน, ชม, ชิ้น, เป็นต้น)
- unit_price (NUMERIC) - ราคาต่อหน่วย
- total (NUMERIC, GENERATED) - = quantity * unit_price
- created_at (TIMESTAMPTZ) - วันที่สร้าง
```

#### 3. **customers** - ลูกค้า (สำหรับ autocomplete)
```sql
- id (UUID) - Primary Key
- name (TEXT) - ชื่อบริษัท/ลูกค้า
- address (TEXT) - ที่อยู่
- tax_id (TEXT) - เลขประจำตัวผู้เสียภาษี
- contact_name (TEXT) - ชื่อผู้ติดต่อ
- phone (TEXT) - เบอร์โทร
- email (TEXT) - อีเมล
- created_at (TIMESTAMPTZ) - วันที่สร้าง
```

#### 4. **companies** - บริษัท (สำหรับ autocomplete)
```sql
- id (UUID) - Primary Key
- name (TEXT) - ชื่อบริษัท
- address (TEXT) - ที่อยู่
- tax_id (TEXT) - เลขประจำตัวผู้เสียภาษี
- phone (TEXT) - เบอร์โทร
- website (TEXT) - เว็บไซต์
- logo_url (TEXT) - URL logo
- created_at (TIMESTAMPTZ) - วันที่สร้าง
```

### Functions & Triggers
- **generate_invoice_number()** - สร้างเลขที่ Invoice อัตโนมัติ (BL{ปี}{ลำดับ})
- **update_updated_at()** - อัปเดต `updated_at` เมื่อแก้ไข invoices

---

## 🔄 Flow การทำงาน (Business Flow)

### 1. **สร้าง Invoice ใหม่** (`/invoices/new`)
```
User → Fill InvoiceForm → Click Save → 
  → API: generateInvoiceNumber() → 
  → API: createInvoice(invoiceData, items) → 
  → Redirect to Home
```
- ระบบสร้างเลขที่ Invoice อัตโนมัติในรูปแบบ `BL{ปี}{ลำดับ}`
- สามารถเลือกลูกค้าจากรายชื่อที่มีอยู่หรือกรอกข้อมูลใหม่
- รายการสินค้า/บริการสามารถเพิ่ม-ลบได้
- ตั้งค่า VAT และหัก ณ ที่จ่าย

### 2. **ดู Invoice** (`/invoices/[id]`)
```
User → Load Invoice Data → Render InvoiceTemplate (2 copies) →
  → Options: 
    - Mark as Paid (status → 'paid')
    - Edit (go to edit page)
    - Print (browser print)
    - Download PDF (html2canvas + jsPDF)
    - Delete (with confirmation)
```
- แสดง Invoice แบบต้นฉบับ + สำเนา
- สามารถเปลี่ยนสถานะเป็น "ชำระแล้ว"
- ดาวน์โหลด PDF (ความละเอียด 4x, scale 1588×2246 px, PNG format)

### 3. **แก้ไข Invoice** (`/invoices/[id]/edit`)
```
User → Load Invoice Data → Edit in InvoiceForm → 
  → Click Save → API: updateInvoice(id, invoiceData, items) → 
  → Redirect to Invoice Detail
```
- สามารถแก้ไขข้อมูลส่วนใหญ่ได้
- **ข้อจำกัด:** หากสถานะเป็น 'paid' หรือ 'cancelled' ห้ามแก้ไข invoice_number
- เลขที่ Invoice สามารถแก้ไขได้ก็ต่อเมื่อสถานะเป็น 'draft' หรือ 'sent'

### 4. **รายการ Invoice ทั้งหมด** (`/`)
```
Display:
  - Stats Dashboard: รายรับทั้งหมด, ชำระแล้ว, รอชำระ
  - Invoice Table: เลขที่, ลูกค้า, วันที่, ยอดรวม, สถานะ, การจัดการ
  - Actions: ดู, แก้ไข, ลบ
```
- สถานะแสดงแบบสีและไอคอน:
  - 🕐 ร่าง (draft) - สีเทา
  - 📤 ส่งแล้ว (sent) - สีน้ำเงิน
  - ✅ ชำระแล้ว (paid) - สีเขียว
  - ❌ ยกเลิก (cancelled) - สีแดง

---

## 📄 Components & Features

### **InvoiceForm.tsx**
- **Purpose:** Form สำหรับสร้าง/แก้ไข Invoice
- **Features:**
  - ฟิลด์ข้อมูลบริษัท (ชื่อ ที่อยู่ เลขประจำตัวผู้เสียภาษี เบอร์โทร เว็บไซต์)
  - ฟิลด์ข้อมูล Invoice (วันออก ครบกำหนด สถานะ)
  - Autocomplete ลูกค้า + ฟิลด์ข้อมูลลูกค้า
  - Dynamic Line Items (เพิ่ม/ลบ รายการ)
  - Editable VAT & Withholding Tax rates
  - Real-time calculation ของยอดรวม
  - Invoice Number editor (แก้ได้เฉพาะสถานะ draft/sent)

### **InvoiceTemplate.tsx**
- **Purpose:** HTML template สำหรับแสดงและ export PDF
- **Features:**
  - A4 page size (210mm × 297mm)
  - Display Invoice ต้นฉบับ + สำเนา
  - Section: Header, Seller, Customer, Line Items, Totals, Notes
  - Thai formatting (วันที่ ตัวเลขในภาษาไทย)
  - Print-friendly design
  - Page counter (ต้นฉบับ/สำเนา)

### **InvoiceForm.tsx - State Management**
```typescript
interface InvoiceFormData {
  invoice_number?: string
  invoice_date: string
  due_date: string
  seller_name: string
  company_name: string
  company_address: string
  company_tax_id: string
  company_phone: string
  company_website: string
  customer_id: string
  customer_name: string
  customer_address: string
  customer_tax_id: string
  contact_name: string
  contact_phone: string
  contact_email: string
  vat_rate: number
  withholding_tax_rate: number
  notes: string
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
}
```

---

## 🛠️ API Functions (`lib/api.ts`)

### Invoice Operations
```typescript
getInvoices()                              // Get all invoices
getInvoiceById(id)                         // Get invoice + items
generateInvoiceNumber()                    // Auto-generate invoice number (BL{year}{seq})
createInvoice(invoiceData, items)          // Create new invoice + items
updateInvoice(id, invoiceData, items)      // Update invoice + items
deleteInvoice(id)                          // Delete invoice
updateInvoiceStatus(id, status)            // Update status only
```

### Customer Operations
```typescript
getCustomers()                             // Get all customers
createCustomer(customerData)               // Create new customer
```

### Helpers
```typescript
calculateTotals(items, vatRate, withholdingRate)
  // Calculate: subtotal, vat_amount, withholding_tax_amount, total

numberToThaiWords(amount)
  // Convert number to Thai words (e.g., 88920 → "แปดหมื่นแปดพันเก้าร้อยยี่สิบบาท")
  // Uses positional system for 4-6 digits: แสน/หมื่น/พัน/ร้อย/สิบ/หน่วย

formatCurrency(amount)
  // Format number as Thai currency (e.g., 1000 → "1,000.00")

formatDate(dateStr)
  // Format date as Thai (e.g., "2025-03-02" → "02/03/2568")
```

---

## 🎨 Styling & UI

### Color Scheme
- **Primary:** #7B5EA7 (Purple)
- **Background:** #F5F5F7 (Light Gray)
- **Text:** #1a1a1a (Dark Gray)
- **Borders:** #e5e7eb (Light Border)

### Font
- Font Family: Sarabun (Thai font)
- Base Font Size: 10pt

### Layout
- Max Width: 1280px (5xl)
- Responsive: Grid 1 column (mobile), 2-3 columns (desktop)
- Shadows: subtle border + shadow-sm

---

## 🔐 Data Validation

### Invoice Status Rules
- `draft` - สามารถแก้ไขได้ทั้งหมด รวม invoice_number
- `sent` - สามารถแก้ไขได้เกือบทั้งหมด รวม invoice_number
- `paid` - ห้ามแก้ไข invoice_number ให้แต่แก้ไขอื่นๆได้
- `cancelled` - ห้ามแก้ไข invoice_number ให้แต่แก้ไขอื่นๆได้

### Invoice Number Format
- Format: `BL{YYYY}{NNNNNN}` (e.g., BL202500000001)
- YYYY = ปีปัจจุบัน
- NNNNNN = ลำดับที่ (6 หลัก padded with zeros)
- Generated auto เมื่อสร้าง Invoice ใหม่

### Required Fields
- invoice_date ✓
- customer_name ✓
- company_name ✓
- seller_name ✓
- invoice_number (auto-generated หรือ manual)
- line items description ✓
- line items quantity + unit_price ✓

---

## 📱 Pages & Routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `app/page.tsx` | Dashboard - รายการ Invoice ทั้งหมด |
| `/invoices/new` | `app/invoices/new/page.tsx` | สร้าง Invoice ใหม่ |
| `/invoices/[id]` | `app/invoices/[id]/page.tsx` | ดู Invoice + Actions |
| `/invoices/[id]/edit` | `app/invoices/[id]/edit/page.tsx` | แก้ไข Invoice |

---

## 🚀 Features Implemented

### ✅ Core
- [x] CRUD Operations (Create, Read, Update, Delete)
- [x] Auto-generate Invoice Number
- [x] VAT Calculation
- [x] Withholding Tax (หัก ณ ที่จ่าย)
- [x] Dynamic Line Items
- [x] Customer Autocomplete

### ✅ Invoice Management
- [x] Status Management (draft → sent → paid/cancelled)
- [x] Edit invoice_number (ถ้าสถานะ ≠ paid/cancelled)
- [x] Mark as Paid (status → paid)
- [x] Delete Invoice

### ✅ Display & Export
- [x] View Invoice (ต้นฉบับ + สำเนา)
- [x] Print Invoice (browser print)
- [x] Export PDF (html2canvas + jsPDF)
- [x] PDF Quality: 4x scale, 1588×2246px, PNG format

### ✅ Helpers
- [x] Thai Number Formatting
- [x] Thai Words Conversion (numberToThaiWords)
- [x] Date Formatting (Thai calendar)
- [x] Currency Formatting

---

## 🔍 Recent Updates & Fixes

### Fixed Issues
1. **InvoiceForm Type Errors** ✅
   - Added `invoice_number` field to form state
   - Added `withholding_tax_rate` & `withholding_tax_amount` to payload
   - Added `item_order` when saving line items

2. **Thai Number Conversion** ✅
   - Fixed `numberToThaiWords()` for 4-6 digit numbers
   - Changed from grouping (thousands) to positional system (แสน/หมื่น/พัน)
   - Example: 88,920 → "แปดหมื่นแปดพันเก้าร้อยยี่สิบบาท" ✓

3. **PDF Export Quality** ✅
   - Increased scale from 2 to 4
   - Changed canvas dimensions from 794×1123 to 1588×2246 (192dpi)
   - Switched from JPEG to PNG (lossless)
   - Added white background (#ffffff)

4. **Invoice Number Editing** ✅
   - Added editable invoice_number field (edit page only)
   - Field disabled when status = 'paid' or 'cancelled'
   - Only included in update payload when allowed

5. **Report Copy Pages** ✅
   - Expanded invoice report to 4 pages with labeled copies:
     - Page 1: ต้นฉบับ(สำหรับลูกค้า)
     - Page 2: สำเนา(สำหรับลูกค้า)
     - Page 3: สำเนา(สำหรับฝ่ายขาย)
     - Page 4: สำเนา(สำหรับบัญชี)
   - Page numbers shown in top-right badge

6. **Invoice Display Layout** ✅
   - Changed "รวมเป็นเงิน" → "รวม"
   - Added "รวมทั้งสิ้น" line (subtotal + VAT) after VAT row
   - Shows correct calculation: subtotal + VAT before withholding tax deduction
   - Updated totals section structure for clarity

7. **PDF Split Export** ✅
   - Split PDF download into 2 separate files:
     - `BLxxxxxx-สำหรับลูกค้า.pdf` (Pages 1-2: ต้นฉบับ + สำเนาลูกค้า)
     - `BLxxxxxx-สำหรับบัญชี.pdf` (Pages 3-4: สำเนาฝ่ายขาย + บัญชี)
   - Both files downloaded simultaneously when "ดาวน์โหลด PDF" button is clicked
   - Maintains high quality (4x scale, PNG format)

### Code Quality
- TypeScript strict mode
- Proper type definitions for all data
- Error handling & user feedback
- ESLint compliance (with known warnings in other files)

---

## 📋 Updated Files (v0.1.1)

| File | Changes |
|------|---------|
| `components/InvoiceTemplate.tsx` | Added `copyLabel` & `pageNo` props; updated totals layout |
| `app/invoices/[id]/page.tsx` | Render 4 labeled pages; split PDF into 2 files with suffixes |
| `components/InvoiceForm.tsx` | Updated form totals display (minor UI label change) |

---

## 🎯 Key Features Summary

### ✅ Core Features
- CRUD Operations (Create, Read, Update, Delete)
- Auto-generate Invoice Number (BL{year}{seq})
- VAT & Withholding Tax Calculation
- Dynamic Line Items
- Customer Autocomplete
- Status Management (draft → sent → paid/cancelled)
- Edit invoice_number (only when status ≠ paid/cancelled)

### ✅ Display & Export
- View Invoice (4 labeled pages in browser)
- Print Invoice (browser print with all 4 pages)
- **Export PDF (Split into 2 files)**:
  - Customer file: Pages 1-2
  - Accounting file: Pages 3-4
- PDF Quality: 4x scale, 192 DPI, PNG format

### ✅ Thai Support
- Thai Number Formatting
- Thai Words Conversion (numberToThaiWords)
- Date Formatting (Thai calendar)
- Currency Formatting
- Complete Thai UI

---

## 🔧 Technical Details

### InvoiceTemplate Props
```typescript
interface InvoiceTemplateProps {
  invoice: Invoice
  items: InvoiceItem[]
  copyLabel?: string    // Custom copy label
  pageNo?: number       // Page number (1-4)
}
```

### PDF Export Flow
```
Click "ดาวน์โหลด PDF"
  ↓
Render 4 invoice pages from DOM
  ↓
Create 2 PDFs in parallel:
  - PDF 1: Pages [0, 1] → สำหรับลูกค้า
  - PDF 2: Pages [2, 3] → สำหรับบัญชี
  ↓
Both files download simultaneously
```
