'use client'
import { Invoice, InvoiceItem } from '@/lib/supabase'
import { formatCurrency, numberToThaiWords } from '@/lib/api'

interface InvoiceTemplateProps {
  invoice: Invoice
  items: InvoiceItem[]
  copy?: 'ต้นฉบับ' | 'สำเนา'
}

export default function InvoiceTemplate({ invoice, items, copy = 'ต้นฉบับ' }: InvoiceTemplateProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  return (
    <div
      className="invoice-page bg-white"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '15mm 18mm',
        fontFamily: "'Sarabun', sans-serif",
        fontSize: '10pt',
        color: '#1a1a1a',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Page number corner */}
      <div style={{
        position: 'absolute',
        top: '5mm',
        right: '18mm',
        width: '24px',
        height: '24px',
        background: '#7B5EA7',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10pt',
        fontWeight: 600,
      }}>
        {copy === 'ต้นฉบับ' ? '1' : '2'}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8mm' }}>
        {/* Logo + Company */}
        <div style={{ flex: 1 }}>
          {/* Logo */}
          {/*<div style={{ marginBottom: '4mm' }}>*/}
            {/*<div style={{*/}
            {/*  width: '44px',*/}
            {/*  height: '44px',*/}
            {/*  display: 'flex',*/}
            {/*  flexDirection: 'column',*/}
            {/*  gap: '3px',*/}
            {/*  padding: '6px',*/}
            {/*  border: '2px solid #7B5EA7',*/}
            {/*}}>*/}
            {/*  {[...Array(5)].map((_, i) => (*/}
            {/*    <div key={i} style={{*/}
            {/*      height: '3px',*/}
            {/*      background: '#7B5EA7',*/}
            {/*      width: i === 0 ? '100%' : i === 4 ? '70%' : '85%',*/}
            {/*    }} />*/}
            {/*  ))}*/}
            {/*</div>*/}
            {/*<p style={{ fontSize: '7pt', color: '#7B5EA7', marginTop: '2px', fontStyle: 'italic' }}>*/}
            {/*  Tom and Friends Technology Co., Ltd.*/}
            {/*</p>*/}
          {/*</div>*/}
          <p style={{ fontSize: '10pt', fontWeight: 600, marginBottom: '1mm' }}>
            {invoice.company_name}
          </p>
          {invoice.company_address && (
            <p style={{ fontSize: '9pt', color: '#444', maxWidth: '220px', lineHeight: 1.5 }}>
              {invoice.company_address}
            </p>
          )}
          {invoice.company_tax_id && (
            <p style={{ fontSize: '9pt', color: '#444' }}>
              เลขประจำตัวผู้เสียภาษี {invoice.company_tax_id}
            </p>
          )}
          {invoice.company_phone && (
            <p style={{ fontSize: '9pt', color: '#444' }}>เบอร์มือถือ {invoice.company_phone}</p>
          )}
          {invoice.company_website && (
            <p style={{ fontSize: '9pt', color: '#444' }}>{invoice.company_website}</p>
          )}
        </div>

        {/* Title + Meta */}
        <div style={{ textAlign: 'right', minWidth: '180px' }}>
          <h1 style={{
            fontSize: '18pt',
            fontWeight: 700,
            color: '#7B5EA7',
            lineHeight: 1.2,
            marginBottom: '2mm',
          }}>
            ใบวางบิล/ใบแจ้งหนี้
          </h1>
          <p style={{ fontSize: '10pt', color: '#7B5EA7', marginBottom: '4mm' }}>{copy}</p>

          <div style={{
            borderTop: '2px solid #7B5EA7',
            paddingTop: '3mm',
          }}>
            <table style={{ width: '100%', fontSize: '9pt' }}>
              <tbody>
                <tr>
                  <td style={{ color: '#666', paddingRight: '8px', paddingBottom: '2px' }}>เลขที่</td>
                  <td style={{ fontWeight: 600 }}>{invoice.invoice_number}</td>
                </tr>
                <tr>
                  <td style={{ color: '#666', paddingBottom: '2px' }}>วันที่</td>
                  <td>{formatDate(invoice.invoice_date)}</td>
                </tr>
                <tr>
                  <td style={{ color: '#666', paddingBottom: '2px' }}>ครบกำหนด</td>
                  <td>{invoice.due_date ? formatDate(invoice.due_date) : '-'}</td>
                </tr>
                <tr>
                  <td style={{ color: '#666' }}>ผู้ขาย</td>
                  <td>{invoice.seller_name}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: '#e0e0e0', marginBottom: '5mm' }} />

      {/* Customer + Contact two-column */}
      <div style={{ display: 'flex', gap: '8mm', marginBottom: '6mm' }}>
        {/* Customer */}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: '9pt', color: '#7B5EA7', fontWeight: 700, marginBottom: '2mm' }}>ลูกค้า</p>
          <p style={{ fontSize: '10pt', fontWeight: 600, marginBottom: '1mm' }}>{invoice.customer_name}</p>
          {invoice.customer_address && (
            <p style={{ fontSize: '9pt', color: '#444', lineHeight: 1.5 }}>{invoice.customer_address}</p>
          )}
          {invoice.customer_tax_id && (
            <p style={{ fontSize: '9pt', color: '#444' }}>เลขประจำตัวผู้เสียภาษี {invoice.customer_tax_id}</p>
          )}
        </div>

        {/* Contact */}
        {(invoice.contact_name || invoice.contact_phone || invoice.contact_email) && (
          <div style={{ minWidth: '180px' }}>
            <div style={{
              background: '#F8F4FF',
              borderRadius: '6px',
              padding: '3mm 4mm',
            }}>
              {invoice.contact_name && (
                <div style={{ marginBottom: '2px' }}>
                  <span style={{ fontSize: '8pt', color: '#7B5EA7', fontWeight: 600 }}>ผู้ติดต่อ</span>
                  <p style={{ fontSize: '9pt', fontWeight: 500 }}>{invoice.contact_name}</p>
                </div>
              )}
              {invoice.contact_phone && (
                <div style={{ marginBottom: '2px' }}>
                  <span style={{ fontSize: '8pt', color: '#7B5EA7', fontWeight: 600 }}>เบอร์โทร</span>
                  <p style={{ fontSize: '9pt' }}>{invoice.contact_phone}</p>
                </div>
              )}
              {invoice.contact_email && (
                <div>
                  <span style={{ fontSize: '8pt', color: '#7B5EA7', fontWeight: 600 }}>อีเมล</span>
                  <p style={{ fontSize: '9pt' }}>{invoice.contact_email}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' }}>
        <thead>
          <tr style={{ background: '#F8F4FF', borderBottom: '1px solid #d0c0e8' }}>
            <th style={{ padding: '3mm 4mm', textAlign: 'center', fontSize: '9pt', fontWeight: 600, width: '8%', color: '#7B5EA7' }}>#</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'left', fontSize: '9pt', fontWeight: 600, color: '#7B5EA7' }}>รายละเอียด</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'center', fontSize: '9pt', fontWeight: 600, width: '12%', color: '#7B5EA7' }}>จำนวน</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'center', fontSize: '9pt', fontWeight: 600, width: '8%', color: '#7B5EA7' }}>หน่วย</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'right', fontSize: '9pt', fontWeight: 600, width: '18%', color: '#7B5EA7' }}>ราคาต่อหน่วย</th>
            <th style={{ padding: '3mm 4mm', textAlign: 'right', fontSize: '9pt', fontWeight: 600, width: '18%', color: '#7B5EA7' }}>ยอดรวม</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '3mm 4mm', textAlign: 'center', fontSize: '9pt' }}>{index + 1}</td>
              <td style={{ padding: '3mm 4mm', fontSize: '9pt' }}>{item.description}</td>
              <td style={{ padding: '3mm 4mm', textAlign: 'center', fontSize: '9pt' }}>{item.quantity}</td>
              <td style={{ padding: '3mm 4mm', textAlign: 'center', fontSize: '9pt' }}>{item.unit}</td>
              <td style={{ padding: '3mm 4mm', textAlign: 'right', fontSize: '9pt' }}>{formatCurrency(item.unit_price)}</td>
              <td style={{ padding: '3mm 4mm', textAlign: 'right', fontSize: '9pt', fontWeight: 500 }}>{formatCurrency(item.total)}</td>
            </tr>
          ))}
          {/* Empty rows for visual */}
          {items.length < 4 && [...Array(4 - items.length)].map((_, i) => (
            <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={{ padding: '3mm 4mm' }}>&nbsp;</td>
              <td style={{ padding: '3mm 4mm' }} />
              <td style={{ padding: '3mm 4mm' }} />
              <td style={{ padding: '3mm 4mm' }} />
              <td style={{ padding: '3mm 4mm' }} />
              <td style={{ padding: '3mm 4mm' }} />
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals + Thai words */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10mm' }}>
        {/* Thai amount in words */}
        <div style={{
          border: '1px solid #d0c0e8',
          borderRadius: '6px',
          padding: '3mm 4mm',
          maxWidth: '250px',
          background: '#fdfaff',
        }}>
          <p style={{ fontSize: '8pt', color: '#7B5EA7', marginBottom: '1mm' }}>จำนวนเงิน (ตัวอักษร)</p>
          <p style={{ fontSize: '9pt', fontWeight: 600 }}>({numberToThaiWords(invoice.total)})</p>
        </div>

        {/* Totals */}
        <div style={{ minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '9pt' }}>
            <span style={{ color: '#7B5EA7' }}>รวมเป็นเงิน</span>
            <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.subtotal)} บาท</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '9pt' }}>
            <span style={{ color: '#7B5EA7' }}>ภาษีมูลค่าเพิ่ม {invoice.vat_rate}%</span>
            <span style={{ fontWeight: 500 }}>{formatCurrency(invoice.vat_amount)} บาท</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '9pt' }}>
            <span style={{ color: '#7B5EA7' }}>หัก ณ ที่จ่าย {invoice.withholding_tax_rate}%</span>
            <span style={{ fontWeight: 500, color: '#e53e3e' }}>
            -{formatCurrency(invoice.withholding_tax_amount)} บาท
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '3px 0',
            borderTop: '2px solid #7B5EA7',
            marginTop: '3px',
            fontSize: '10pt',
            fontWeight: 700,
          }}>
            <span style={{ color: '#7B5EA7' }}>จำนวนเงินรวมทั้งสิ้น</span>
            <span style={{ color: '#7B5EA7' }} className="ml-0.5">{formatCurrency(invoice.total)} บาท</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div style={{ marginBottom: '8mm', fontSize: '9pt', color: '#666' }}>
          <span style={{ fontWeight: 600, color: '#7B5EA7' }}>หมายเหตุ: </span>
          {invoice.notes}
        </div>
      )}

      {/* Signature section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20mm' }}>
        <div style={{ textAlign: 'center', minWidth: '160px' }}>
          <p style={{ fontSize: '9pt', fontWeight: 600, marginBottom: '12mm' }}>ในนาม {invoice.customer_name}</p>
          <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>
            <table style={{ width: '100%', fontSize: '8pt', color: '#666' }}>
              <tbody>
                <tr>
                  <td>ผู้รับวางบิล</td>
                  <td>วันที่</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ textAlign: 'center', minWidth: '200px' }}>
          <p style={{ fontSize: '9pt', fontWeight: 600, marginBottom: '12mm' }}>ในนาม บริษัท ทอมแอนด์เฟรนด์เทคโนโลยี จำกัด</p>
          <div style={{ borderTop: '1px solid #333', paddingTop: '2mm' }}>
            <table style={{ width: '100%', fontSize: '8pt', color: '#666' }}>
              <tbody>
                <tr>
                  <td>ผู้วางบิล</td>
                  <td>วันที่</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '10mm',
        left: '18mm',
        right: '18mm',
        borderTop: '1px solid #e0e0e0',
        paddingTop: '3mm',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '4px',
      }}>
        <span style={{ fontSize: '8pt', color: '#999' }}>by</span>
        <span style={{ fontSize: '8pt', color: '#7B5EA7', fontWeight: 700 }}>WeAccount</span>
      </div>
    </div>
  )
}
