# 📄 Invoice System — Tom and Friends Technology

ระบบออก Invoice / ใบแจ้งหนี้ ด้วย **Next.js 14 + Supabase**  
รองรับการดาวน์โหลด PDF และพิมพ์ใบแจ้งหนี้ทั้งต้นฉบับและสำเนา

---

## 🚀 ขั้นตอนการติดตั้ง

### 1. สร้าง Supabase Project
1. ไปที่ https://supabase.com → สร้าง Project ใหม่
2. ไปที่ SQL Editor → รัน `supabase/schema.sql` ทั้งหมด
3. คัดลอก Project URL และ anon key จาก Settings → API

### 2. ติดตั้ง
```bash
npm install
cp .env.local.example .env.local
# แก้ไข .env.local ใส่ Supabase URL และ Key
npm run dev
```

### 3. Tests
```bash
npm test
```

---

## 📁 โครงสร้างโปรเจกต์

```
invoice-system/
├── app/
│   ├── page.tsx                    # Dashboard
│   ├── globals.css
│   ├── layout.tsx
│   └── invoices/
│       ├── new/page.tsx            # สร้าง Invoice
│       └── [id]/
│           ├── page.tsx            # Preview + Download
│           └── edit/page.tsx       # แก้ไข
├── components/
│   ├── InvoiceForm.tsx             # ฟอร์มสร้าง/แก้ไข
│   └── InvoiceTemplate.tsx         # Template ตาม PDF
├── lib/
│   ├── supabase.ts                 # Client + Types
│   └── api.ts                      # CRUD + Helpers
└── supabase/
    └── schema.sql                  # Database Schema
```

## ✨ Features
- สร้าง/แก้ไข Invoice พร้อม auto-generate เลข
- คำนวณ VAT และยอดรวมอัตโนมัติ
- แปลงเงินเป็นตัวอักษรภาษาไทย
- Download PDF ต้นฉบับ + สำเนา
- จัดการสถานะ draft/sent/paid/cancelled
- Dashboard สถิติรายรับ
- 
