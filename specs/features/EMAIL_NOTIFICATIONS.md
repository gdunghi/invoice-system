# 📧 Email Notifications Feature

## Overview
ระบบส่ง email อัตโนมัติสำหรับใบแจ้งหนี้ รวมถึงการแจ้งเตือนครบกำหนด และยืนยันการชำระเงิน

---

## 🎯 Business Goals

### Primary Goals
1. ส่งใบแจ้งหนี้ทาง email พร้อม PDF attachment
2. แจ้งเตือนใบแจ้งหนี้ใกล้ครบกำหนด (3, 7, 14 days)
3. ยืนยันการรับชำระเงิน
4. ลดเวลาในการ manual follow-up
5. เพิ่ม conversion rate การชำระเงิน

### Success Metrics
- Email delivery rate > 98%
- Open rate > 40%
- Payment rate increase by 20%
- Reduce overdue invoices by 30%

---

## 📋 Email Types

### 1. Invoice Delivery Email
**Trigger:** Manual send หรือ auto-send เมื่อ status = 'sent'

**Template:**
```
Subject: ใบแจ้งหนี้ #{invoice_number} จาก {company_name}

เรียน คุณ{customer_name}

ขอบคุณสำหรับการใช้บริการ
ส่งใบแจ้งหนี้มาให้ตรวจสอบดังนี้

เลขที่ใบแจ้งหนี้: {invoice_number}
วันที่: {invoice_date}
ครบกำหนดชำระ: {due_date}
ยอดรวม: {total} บาท

รายละเอียดตามไฟล์แนบ (PDF)

[View Online] [Download PDF]

หากมีข้อสงสัย กรุณาติดต่อ
โทร: {company_phone}
Email: {company_email}

ขอแสดงความนับถือ
{seller_name}
{company_name}
```

**Attachment:** Invoice PDF (2 pages)

### 2. Payment Reminder Email
**Trigger:** Scheduled job ทุก 9:00 AM

**Types:**
- 7 days before due date
- 3 days before due date
- 1 day before due date

**Template:**
```
Subject: ⏰ แจ้งเตือน: ใบแจ้งหนี้ #{invoice_number} ครบกำหนดใน {days} วัน

เรียน คุณ{customer_name}

แจ้งเตือนว่าใบแจ้งหนี้ด้านล่างจะครบกำหนดชำระใน {days} วัน

เลขที่: {invoice_number}
วันที่ออก: {invoice_date}
ครบกำหนด: {due_date}
ยอดที่ต้องชำระ: {total} บาท

[View Invoice] [Mark as Paid]

ขอบคุณครับ
{company_name}
```

### 3. Overdue Notice Email
**Trigger:** Daily check at 10:00 AM for overdue invoices

**Template:**
```
Subject: ⚠️ ใบแจ้งหนี้ #{invoice_number} เกินกำหนดชำระ

เรียน คุณ{customer_name}

ใบแจ้งหนี้ด้านล่างเกินกำหนดชำระแล้ว {days_overdue} วัน

เลขที่: {invoice_number}
วันครบกำหนด: {due_date}
ยอดค้างชำระ: {total} บาท

กรุณาดำเนินการชำระภายใน 3 วัน
มิฉะนั้นอาจมีค่าปรับ 2% ต่อเดือน

[Pay Now] [Contact Us]

หากชำระเงินแล้ว กรุณาติดต่อกลับ
โทร: {company_phone}

ขอแสดงความนับถือ
{company_name}
```

### 4. Payment Confirmation Email
**Trigger:** When invoice status changed to 'paid'

**Template:**
```
Subject: ✅ ยืนยันการรับชำระเงิน #{invoice_number}

เรียน คุณ{customer_name}

ขอบคุณสำหรับการชำระเงิน
เราได้รับชำระเงินสำหรับใบแจ้งหนี้ดังนี้แล้ว

เลขที่: {invoice_number}
วันที่ชำระ: {paid_date}
จำนวนเงิน: {total} บาท

[Download Receipt]

ขอแสดงความนับถือ
{company_name}
```

---

## 🗄️ Database Changes

### New Tables

```sql
-- Email logs table
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  email_type VARCHAR(50) NOT NULL, -- 'invoice', 'reminder', 'overdue', 'confirmation'
  recipient_email VARCHAR(255) NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  error_message TEXT,
  provider_id VARCHAR(255), -- ID from email service provider
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_invoice ON email_logs(invoice_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created ON email_logs(created_at DESC);

-- Email templates table
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) UNIQUE NOT NULL, -- 'invoice', 'reminder', 'overdue', 'confirmation'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  variables JSONB, -- List of available variables
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email settings table
CREATE TABLE email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255),
  auto_send_invoice BOOLEAN DEFAULT false,
  reminder_days_before JSONB DEFAULT '[7, 3, 1]', -- [7, 3, 1] days
  send_overdue_notice BOOLEAN DEFAULT true,
  send_payment_confirmation BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add email field to invoices if not exists
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS email_opened_at TIMESTAMPTZ;
```

### Add Indexes

```sql
-- For finding invoices to send reminders
CREATE INDEX idx_invoices_due_date_status 
  ON invoices(due_date, status) 
  WHERE status IN ('sent', 'draft');

-- For tracking email activity
CREATE INDEX idx_invoices_email_sent 
  ON invoices(email_sent_at) 
  WHERE email_sent_at IS NOT NULL;
```

---

## 🔌 API Endpoints

### Email Sending APIs

```typescript
// POST /api/invoices/:id/send-email
Request: {
  recipient_email?: string, // Override customer email
  cc?: string[],
  message?: string, // Additional message
  attach_pdf: boolean
}
Response: {
  success: boolean,
  email_id: string,
  sent_at: string
}

// POST /api/emails/send-reminders
// Cron job endpoint
Response: {
  sent: number,
  failed: number,
  emails: Array<{ invoice_id, status }>
}

// POST /api/emails/send-overdue-notices
// Cron job endpoint
Response: {
  sent: number,
  failed: number
}

// GET /api/emails/logs
Query: ?invoice_id=xxx&type=reminder&status=sent
Response: {
  logs: Array<EmailLog>
}

// POST /api/emails/templates
// Update email template
Body: {
  type: string,
  subject: string,
  body: string
}
Response: {
  template: EmailTemplate
}

// GET /api/emails/settings
// Get email settings
Response: {
  settings: EmailSettings
}

// PUT /api/emails/settings
// Update email settings
Body: EmailSettings
Response: {
  settings: EmailSettings
}
```

---

## 📦 Implementation

### Phase 1: Email Service Integration (Week 1)

#### 1.1 Choose Email Provider

**Options:**
1. **Resend** ✅ Recommended
   - Free tier: 3,000 emails/month
   - Excellent DX (Developer Experience)
   - Support Thai characters
   - Good deliverability
   
2. **SendGrid**
   - Free tier: 100 emails/day
   - Established provider
   
3. **AWS SES**
   - Cheapest ($0.10 per 1,000 emails)
   - More complex setup

#### 1.2 Install Resend

```bash
npm install resend
```

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  attachments?: Array<{
    filename: string
    content: Buffer
  }>
  cc?: string[]
  replyTo?: string
}

export async function sendEmail(params: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
    to: params.to,
    subject: params.subject,
    html: params.html,
    attachments: params.attachments,
    cc: params.cc,
    reply_to: params.replyTo,
  })
  
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }
  
  return data
}
```

#### 1.3 Create Email Templates

```typescript
// lib/email-templates.ts
export interface InvoiceEmailData {
  invoice_number: string
  customer_name: string
  company_name: string
  seller_name: string
  invoice_date: string
  due_date: string
  total: number
  invoice_id: string
  company_phone?: string
  company_email?: string
}

export function renderInvoiceEmail(data: InvoiceEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Sarabun', sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #7B5EA7; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px; background: #f9f9f9; }
    .invoice-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
    .button { 
      display: inline-block; 
      padding: 12px 24px; 
      background: #7B5EA7; 
      color: white; 
      text-decoration: none; 
      border-radius: 6px; 
      margin: 10px 5px;
    }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${data.company_name}</h1>
    </div>
    
    <div class="content">
      <p>เรียน คุณ${data.customer_name}</p>
      
      <p>ขอบคุณสำหรับการใช้บริการ ส่งใบแจ้งหนี้มาให้ตรวจสอบดังนี้</p>
      
      <div class="invoice-details">
        <table width="100%" cellpadding="8">
          <tr>
            <td><strong>เลขที่ใบแจ้งหนี้:</strong></td>
            <td>${data.invoice_number}</td>
          </tr>
          <tr>
            <td><strong>วันที่:</strong></td>
            <td>${data.invoice_date}</td>
          </tr>
          <tr>
            <td><strong>ครบกำหนดชำระ:</strong></td>
            <td>${data.due_date}</td>
          </tr>
          <tr>
            <td><strong>ยอดรวม:</strong></td>
            <td style="font-size: 18px; color: #7B5EA7;"><strong>฿${data.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_URL}/invoices/${data.invoice_id}" class="button">
          ดูใบแจ้งหนี้
        </a>
        <a href="${process.env.NEXT_PUBLIC_URL}/invoices/${data.invoice_id}/pdf" class="button">
          ดาวน์โหลด PDF
        </a>
      </div>
      
      <p style="margin-top: 30px;">หากมีข้อสงสัย กรุณาติดต่อ</p>
      ${data.company_phone ? `<p>โทร: ${data.company_phone}</p>` : ''}
      ${data.company_email ? `<p>Email: ${data.company_email}</p>` : ''}
      
      <p style="margin-top: 20px;">ขอแสดงความนับถือ<br>${data.seller_name}<br>${data.company_name}</p>
    </div>
    
    <div class="footer">
      <p>Email นี้ถูกส่งอัตโนมัติ กรุณาอย่าตอบกลับ</p>
    </div>
  </div>
</body>
</html>
  `
}

export function renderReminderEmail(data: InvoiceEmailData & { days_until_due: number }): string {
  return `
<!DOCTYPE html>
<html>
<body>
  <div class="container">
    <div class="header" style="background: #f59e0b;">
      <h1>⏰ แจ้งเตือนใบแจ้งหนี้</h1>
    </div>
    
    <div class="content">
      <p>เรียน คุณ${data.customer_name}</p>
      
      <p>แจ้งเตือนว่าใบแจ้งหนี้ด้านล่างจะครบกำหนดชำระใน <strong>${data.days_until_due} วัน</strong></p>
      
      <div class="invoice-details">
        <table width="100%">
          <tr><td>เลขที่:</td><td>${data.invoice_number}</td></tr>
          <tr><td>วันที่ออก:</td><td>${data.invoice_date}</td></tr>
          <tr><td>ครบกำหนด:</td><td><strong style="color: #f59e0b;">${data.due_date}</strong></td></tr>
          <tr><td>ยอดที่ต้องชำระ:</td><td><strong>฿${data.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></td></tr>
        </table>
      </div>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_URL}/invoices/${data.invoice_id}" class="button">
          ดูใบแจ้งหนี้
        </a>
      </div>
      
      <p style="margin-top: 20px;">ขอบคุณครับ<br>${data.company_name}</p>
    </div>
  </div>
</body>
</html>
  `
}

export function renderOverdueEmail(data: InvoiceEmailData & { days_overdue: number }): string {
  return `
<!DOCTYPE html>
<html>
<body>
  <div class="container">
    <div class="header" style="background: #dc2626;">
      <h1>⚠️ ใบแจ้งหนี้เกินกำหนด</h1>
    </div>
    
    <div class="content">
      <p>เรียน คุณ${data.customer_name}</p>
      
      <p style="color: #dc2626; font-weight: bold;">
        ใบแจ้งหนี้ด้านล่างเกินกำหนดชำระแล้ว ${data.days_overdue} วัน
      </p>
      
      <div class="invoice-details">
        <table width="100%">
          <tr><td>เลขที่:</td><td>${data.invoice_number}</td></tr>
          <tr><td>วันครบกำหนด:</td><td style="color: #dc2626;"><strong>${data.due_date}</strong></td></tr>
          <tr><td>ยอดค้างชำระ:</td><td><strong style="color: #dc2626; font-size: 18px;">฿${data.total.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong></td></tr>
        </table>
      </div>
      
      <p style="background: #fee2e2; padding: 15px; border-left: 4px solid #dc2626;">
        กรุณาดำเนินการชำระภายใน 3 วัน<br>
        มิฉะนั้นอาจมีค่าปรับ 2% ต่อเดือน
      </p>
      
      <div style="text-align: center;">
        <a href="${process.env.NEXT_PUBLIC_URL}/invoices/${data.invoice_id}" class="button" style="background: #dc2626;">
          ชำระเลย
        </a>
      </div>
      
      <p>หากชำระเงินแล้ว กรุณาติดต่อกลับ</p>
      ${data.company_phone ? `<p>โทร: ${data.company_phone}</p>` : ''}
      
      <p style="margin-top: 20px;">ขอแสดงความนับถือ<br>${data.company_name}</p>
    </div>
  </div>
</body>
</html>
  `
}
```

### Phase 2: API Implementation (Week 2)

#### 2.1 Send Invoice Email API

```typescript
// app/api/invoices/[id]/send-email/route.ts
import { sendEmail } from '@/lib/email'
import { renderInvoiceEmail } from '@/lib/email-templates'
import { getInvoiceById } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json()
    const { invoice, items } = await getInvoiceById(params.id)
    
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    const recipientEmail = body.recipient_email || invoice.contact_email
    if (!recipientEmail) {
      return Response.json({ error: 'No email address found' }, { status: 400 })
    }
    
    // Render email HTML
    const html = renderInvoiceEmail({
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      company_name: invoice.company_name,
      seller_name: invoice.seller_name,
      invoice_date: invoice.invoice_date,
      due_date: invoice.due_date || '-',
      total: invoice.total,
      invoice_id: invoice.id,
      company_phone: invoice.company_phone,
      company_email: process.env.EMAIL_FROM,
    })
    
    // Generate PDF if needed
    let attachments
    if (body.attach_pdf) {
      const pdfBuffer = await generateInvoicePDF(invoice.id)
      attachments = [{
        filename: `${invoice.invoice_number}.pdf`,
        content: pdfBuffer
      }]
    }
    
    // Send email
    const result = await sendEmail({
      to: recipientEmail,
      subject: `ใบแจ้งหนี้ ${invoice.invoice_number} จาก ${invoice.company_name}`,
      html,
      attachments,
      cc: body.cc,
    })
    
    // Log email
    await supabase.from('email_logs').insert({
      invoice_id: invoice.id,
      email_type: 'invoice',
      recipient_email: recipientEmail,
      subject: `ใบแจ้งหนี้ ${invoice.invoice_number}`,
      body: html,
      status: 'sent',
      sent_at: new Date().toISOString(),
      provider_id: result.id,
    })
    
    // Update invoice
    await supabase
      .from('invoices')
      .update({
        email_sent_at: new Date().toISOString(),
        status: invoice.status === 'draft' ? 'sent' : invoice.status,
      })
      .eq('id', invoice.id)
    
    return Response.json({
      success: true,
      email_id: result.id,
      sent_at: new Date().toISOString(),
    })
    
  } catch (error: any) {
    console.error('Send email error:', error)
    return Response.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

#### 2.2 Scheduled Reminders (Cron Job)

```typescript
// app/api/emails/send-reminders/route.ts
import { sendEmail } from '@/lib/email'
import { renderReminderEmail } from '@/lib/email-templates'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const reminderDays = [7, 3, 1] // Days before due date
    const results = []
    
    for (const days of reminderDays) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + days)
      const targetDateStr = targetDate.toISOString().split('T')[0]
      
      // Find invoices due in X days
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .eq('status', 'sent')
        .eq('due_date', targetDateStr)
      
      if (!invoices || invoices.length === 0) continue
      
      for (const invoice of invoices) {
        if (!invoice.contact_email) continue
        
        // Check if reminder already sent today
        const { data: existingLog } = await supabase
          .from('email_logs')
          .select('id')
          .eq('invoice_id', invoice.id)
          .eq('email_type', 'reminder')
          .gte('created_at', new Date().toISOString().split('T')[0])
          .single()
        
        if (existingLog) continue
        
        try {
          const html = renderReminderEmail({
            ...invoice,
            days_until_due: days,
          })
          
          await sendEmail({
            to: invoice.contact_email,
            subject: `⏰ แจ้งเตือน: ใบแจ้งหนี้ ${invoice.invoice_number} ครบกำหนดใน ${days} วัน`,
            html,
          })
          
          await supabase.from('email_logs').insert({
            invoice_id: invoice.id,
            email_type: 'reminder',
            recipient_email: invoice.contact_email,
            subject: `Reminder ${days} days`,
            body: html,
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          
          results.push({ invoice_id: invoice.id, status: 'sent' })
        } catch (error) {
          results.push({ invoice_id: invoice.id, status: 'failed', error: error.message })
        }
      }
    }
    
    return Response.json({
      sent: results.filter(r => r.status === 'sent').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    })
    
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
```

#### 2.3 Setup Vercel Cron Jobs

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/emails/send-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/emails/send-overdue-notices",
      "schedule": "0 10 * * *"
    }
  ]
}
```

### Phase 3: UI Integration (Week 3)

#### 3.1 Add Send Email Button

```typescript
// app/invoices/[id]/page.tsx
export default function InvoiceViewPage() {
  // ...existing code...
  
  const [sendingEmail, setSendingEmail] = useState(false)
  
  async function handleSendEmail() {
    if (!invoice?.contact_email) {
      alert('ไม่พบ email ของลูกค้า กรุณาเพิ่ม email ก่อน')
      return
    }
    
    if (!confirm(`ส่งใบแจ้งหนี้ไปที่ ${invoice.contact_email}?`)) return
    
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attach_pdf: true
        })
      })
      
      if (!res.ok) throw new Error('Failed to send email')
      
      alert('ส่ง email สำเร็จ')
      await loadInvoice() // Reload to update email_sent_at
    } catch (error: any) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } finally {
      setSendingEmail(false)
    }
  }
  
  return (
    // ...existing code...
    <button
      onClick={handleSendEmail}
      disabled={sendingEmail}
      className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg"
    >
      <Mail className="w-4 h-4" />
      {sendingEmail ? 'กำลังส่ง...' : 'ส่ง Email'}
    </button>
  )
}
```

#### 3.2 Email Settings Page

```typescript
// app/settings/email/page.tsx
'use client'
import { useEffect, useState } from 'react'

export default function EmailSettingsPage() {
  const [settings, setSettings] = useState({
    from_email: '',
    from_name: '',
    auto_send_invoice: false,
    reminder_days_before: [7, 3, 1],
    send_overdue_notice: true,
    send_payment_confirmation: true,
  })
  
  const handleSave = async () => {
    await fetch('/api/emails/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
    alert('บันทึกสำเร็จ')
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Email Settings</h1>
      
      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label>From Email</label>
          <input
            type="email"
            value={settings.from_email}
            onChange={e => setSettings(prev => ({ ...prev, from_email: e.target.value }))}
          />
        </div>
        
        <div>
          <label>From Name</label>
          <input
            type="text"
            value={settings.from_name}
            onChange={e => setSettings(prev => ({ ...prev, from_name: e.target.value }))}
          />
        </div>
        
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.auto_send_invoice}
              onChange={e => setSettings(prev => ({ ...prev, auto_send_invoice: e.target.checked }))}
            />
            Auto-send invoice when status = 'sent'
          </label>
        </div>
        
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.send_overdue_notice}
              onChange={e => setSettings(prev => ({ ...prev, send_overdue_notice: e.target.checked }))}
            />
            Send overdue notices
          </label>
        </div>
        
        <button onClick={handleSave} className="px-4 py-2 bg-[#7B5EA7] text-white rounded-lg">
          Save Settings
        </button>
      </div>
    </div>
  )
}
```

---

## 🧪 Testing

```typescript
// tests/features/email-notifications.test.ts
describe('Email Notifications', () => {
  it('should send invoice email', async () => {
    const res = await fetch('/api/invoices/inv-1/send-email', {
      method: 'POST',
      body: JSON.stringify({ attach_pdf: true })
    })
    
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
  
  it('should send payment reminders', async () => {
    const res = await fetch('/api/emails/send-reminders', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
    })
    
    const data = await res.json()
    expect(data.sent).toBeGreaterThanOrEqual(0)
  })
})
```

---

## 📊 Success Metrics

### Technical KPIs
- Email delivery rate > 98%
- Average send time < 3 seconds
- Bounce rate < 2%
- Open rate tracking accuracy

### Business KPIs
- Email open rate
- Link click rate
- Payment rate after reminder
- Reduction in overdue days

---

## 🚀 Future Enhancements

### Phase 4: Advanced Features
- [ ] Email templates editor (WYSIWYG)
- [ ] A/B testing for subject lines
- [ ] Unsubscribe functionality
- [ ] Email analytics dashboard
- [ ] SMS notifications (for urgent)
- [ ] WhatsApp integration
- [ ] Multi-language support
- [ ] Personalized sending times
- [ ] Email tracking (opens, clicks)
- [ ] Reply handling (webhook)

---

**Last Updated:** March 2, 2026  
**Status:** 📝 Planning  
**Priority:** Medium  
**Estimated Effort:** 3 weeks  
**Cost:** Free tier (Resend: 3,000 emails/month)

