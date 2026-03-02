# 📊 Reports & Dashboard Feature

## Overview
Dashboard และ reports system สำหรับวิเคราะห์ยอดขาย ติดตามการชำระเงิน และดูภาพรวมทางธุรกิจ

---

## 🎯 Business Goals

### Primary Goals
1. แสดงภาพรวมธุรกิจแบบ real-time
2. วิเคราะห์รายได้รายเดือน/ไตรมาส/ปี
3. ติดตามลูกค้าที่ค้างชำระ
4. Export รายงานเป็น Excel/CSV

### Success Metrics
- Dashboard load time < 2 seconds
- Report generation < 5 seconds
- User satisfaction ≥ 90%

---

## 👥 User Stories

### Dashboard
```
AS AN accountant
I WANT TO see summary of sales, payments, and outstanding invoices
SO THAT I can monitor business performance at a glance
```

### Sales Report
```
AS A business owner
I WANT TO view sales report by date range
SO THAT I can analyze revenue trends
```

### Customer Report
```
AS AN accountant
I WANT TO see which customers have overdue payments
SO THAT I can follow up for payment collection
```

### Export Report
```
AS A manager
I WANT TO export reports to Excel
SO THAT I can share with stakeholders
```

---

## 🎨 UI/UX Design

### 1. Dashboard Page (`/dashboard`)

```
┌─────────────────────────────────────────────────┐
│  Dashboard                            [Filter]   │
├─────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 💰 Total │  │ ✅ Paid  │  │ ⏰ Overdue│     │
│  │ ฿250,000 │  │ ฿180,000 │  │ ฿70,000  │     │
│  │ 25 inv.  │  │ 18 inv.  │  │ 7 inv.   │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                  │
│  📈 Revenue Trend (Last 6 Months)               │
│  ┌──────────────────────────────────────────┐  │
│  │     [Chart: Line Graph]                   │  │
│  │                                           │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  📋 Recent Invoices                             │
│  ┌──────────────────────────────────────────┐  │
│  │ INV-001 | Customer A | ฿10,000 | Paid    │  │
│  │ INV-002 | Customer B | ฿5,000  | Overdue │  │
│  └──────────────────────────────────────────┘  │
│                                                  │
│  👥 Top Customers                               │
│  ┌──────────────────────────────────────────┐  │
│  │ 1. Customer A - ฿50,000 (5 invoices)     │  │
│  │ 2. Customer B - ฿30,000 (3 invoices)     │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 2. Reports Page (`/reports`)

```
┌─────────────────────────────────────────────────┐
│  Reports                                         │
├─────────────────────────────────────────────────┤
│                                                  │
│  Report Type: [Sales Report ▼]                 │
│  Date Range: [2024-01-01] to [2024-12-31]      │
│  Status: [All ▼]                                │
│  [Generate Report] [Export Excel]               │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ Sales Report (Jan - Dec 2024)           │   │
│  ├─────────────────────────────────────────┤   │
│  │ Month    | Invoices | Total Revenue    │   │
│  ├─────────────────────────────────────────┤   │
│  │ January  | 15       | ฿150,000         │   │
│  │ February | 18       | ฿180,000         │   │
│  │ March    | 12       | ฿120,000         │   │
│  │ ...                                     │   │
│  ├─────────────────────────────────────────┤   │
│  │ Total    | 180      | ฿1,800,000       │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 🗄️ Database Changes

### New Tables

```sql
-- Reports cache table (optional, for performance)
CREATE TABLE report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  filters JSONB,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX idx_report_cache_type_dates 
  ON report_cache(report_type, start_date, end_date);
CREATE INDEX idx_report_cache_expires 
  ON report_cache(expires_at);
```

### Views for Reports

```sql
-- Monthly sales summary view
CREATE VIEW monthly_sales AS
SELECT 
  DATE_TRUNC('month', invoice_date) as month,
  COUNT(*) as invoice_count,
  SUM(total) as total_revenue,
  SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_amount,
  SUM(CASE WHEN status = 'sent' AND due_date < CURRENT_DATE THEN total ELSE 0 END) as overdue_amount
FROM invoices
GROUP BY DATE_TRUNC('month', invoice_date)
ORDER BY month DESC;

-- Customer sales summary view
CREATE VIEW customer_sales AS
SELECT 
  customer_name,
  COUNT(*) as invoice_count,
  SUM(total) as total_amount,
  MAX(invoice_date) as last_invoice_date,
  SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END) as paid_amount,
  SUM(CASE WHEN status != 'paid' THEN total ELSE 0 END) as outstanding_amount
FROM invoices
GROUP BY customer_name
ORDER BY total_amount DESC;

-- Overdue invoices view
CREATE VIEW overdue_invoices AS
SELECT 
  id,
  invoice_number,
  customer_name,
  invoice_date,
  due_date,
  total,
  CURRENT_DATE - due_date as days_overdue
FROM invoices
WHERE status = 'sent' 
  AND due_date < CURRENT_DATE
ORDER BY days_overdue DESC;
```

---

## 🔌 API Endpoints

### Dashboard API
```typescript
// GET /api/dashboard/summary
Response: {
  total_invoices: number
  total_revenue: number
  paid_amount: number
  outstanding_amount: number
  overdue_amount: number
  overdue_count: number
}

// GET /api/dashboard/revenue-trend
Query: ?period=6months
Response: {
  data: [
    { month: '2024-01', revenue: 150000 },
    { month: '2024-02', revenue: 180000 },
    ...
  ]
}

// GET /api/dashboard/top-customers
Query: ?limit=10
Response: {
  customers: [
    { name: 'Customer A', total: 50000, count: 5 },
    ...
  ]
}
```

### Reports API
```typescript
// GET /api/reports/sales
Query: ?start_date=2024-01-01&end_date=2024-12-31&group_by=month
Response: {
  report_type: 'sales',
  period: { start: '2024-01-01', end: '2024-12-31' },
  data: [
    { period: 'Jan 2024', invoices: 15, revenue: 150000 },
    ...
  ],
  summary: {
    total_invoices: 180,
    total_revenue: 1800000,
    avg_per_month: 150000
  }
}

// GET /api/reports/customers
Query: ?sort_by=total&limit=50
Response: {
  customers: [
    {
      name: 'Customer A',
      invoice_count: 5,
      total_amount: 50000,
      paid_amount: 40000,
      outstanding_amount: 10000,
      last_invoice: '2024-03-01'
    },
    ...
  ]
}

// GET /api/reports/overdue
Response: {
  invoices: [
    {
      invoice_number: 'INV-001',
      customer_name: 'Customer A',
      amount: 10000,
      due_date: '2024-02-15',
      days_overdue: 15
    },
    ...
  ]
}

// POST /api/reports/export
Body: {
  report_type: 'sales',
  format: 'excel' | 'csv',
  filters: { start_date, end_date, ... }
}
Response: File download (Excel/CSV)
```

---

## 📦 Implementation

### Phase 1: Dashboard (Week 1)

#### 1.1 Create Dashboard API
```typescript
// app/api/dashboard/summary/route.ts
export async function GET() {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total, status, due_date')
  
  const summary = {
    total_invoices: invoices.length,
    total_revenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
    paid_amount: invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0),
    outstanding_amount: invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.total, 0),
    overdue_count: invoices
      .filter(inv => inv.status === 'sent' && new Date(inv.due_date) < new Date())
      .length
  }
  
  return Response.json(summary)
}
```

#### 1.2 Create Dashboard Page
```typescript
// app/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  
  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then(res => res.json())
      .then(data => setSummary(data))
  }, [])
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <SummaryCard
          title="Total Revenue"
          value={summary?.total_revenue}
          count={summary?.total_invoices}
          icon="💰"
        />
        <SummaryCard
          title="Paid"
          value={summary?.paid_amount}
          icon="✅"
        />
        <SummaryCard
          title="Overdue"
          value={summary?.outstanding_amount}
          count={summary?.overdue_count}
          icon="⏰"
          variant="warning"
        />
      </div>
      
      {/* Charts */}
      <RevenueTrendChart />
      <TopCustomersTable />
    </div>
  )
}
```

#### 1.3 Add Chart Library
```bash
npm install recharts
```

```typescript
// components/RevenueTrendChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

export default function RevenueTrendChart({ data }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Revenue Trend</h2>
      <LineChart width={800} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="revenue" stroke="#7B5EA7" />
      </LineChart>
    </div>
  )
}
```

### Phase 2: Reports (Week 2)

#### 2.1 Create Reports API
```typescript
// app/api/reports/sales/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const groupBy = searchParams.get('group_by') || 'month'
  
  const { data } = await supabase.rpc('get_sales_report', {
    start_date: startDate,
    end_date: endDate,
    group_by: groupBy
  })
  
  return Response.json(data)
}
```

#### 2.2 Create SQL Function
```sql
-- supabase/migrations/add_reports_functions.sql
CREATE OR REPLACE FUNCTION get_sales_report(
  start_date DATE,
  end_date DATE,
  group_by VARCHAR DEFAULT 'month'
)
RETURNS TABLE (
  period TEXT,
  invoice_count BIGINT,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(DATE_TRUNC(group_by, invoice_date), 'Mon YYYY') as period,
    COUNT(*) as invoice_count,
    SUM(total) as total_revenue
  FROM invoices
  WHERE invoice_date BETWEEN start_date AND end_date
  GROUP BY DATE_TRUNC(group_by, invoice_date)
  ORDER BY DATE_TRUNC(group_by, invoice_date);
END;
$$ LANGUAGE plpgsql;
```

#### 2.3 Create Reports Page
```typescript
// app/reports/page.tsx
'use client'
import { useState } from 'react'

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const [dateRange, setDateRange] = useState({
    start: '2024-01-01',
    end: '2024-12-31'
  })
  
  const handleGenerateReport = async () => {
    const res = await fetch(
      `/api/reports/${reportType}?start_date=${dateRange.start}&end_date=${dateRange.end}`
    )
    const data = await res.json()
    setReportData(data)
  }
  
  const handleExport = async () => {
    const res = await fetch('/api/reports/export', {
      method: 'POST',
      body: JSON.stringify({ reportType, dateRange })
    })
    const blob = await res.blob()
    downloadFile(blob, `report-${reportType}-${Date.now()}.xlsx`)
  }
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      
      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="grid grid-cols-3 gap-4">
          <select value={reportType} onChange={e => setReportType(e.target.value)}>
            <option value="sales">Sales Report</option>
            <option value="customers">Customer Report</option>
            <option value="overdue">Overdue Report</option>
          </select>
          
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
          />
          
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
          />
        </div>
        
        <div className="flex gap-4 mt-4">
          <button onClick={handleGenerateReport}>Generate Report</button>
          <button onClick={handleExport}>Export Excel</button>
        </div>
      </div>
      
      {/* Report Display */}
      <ReportTable data={reportData} type={reportType} />
    </div>
  )
}
```

### Phase 3: Export (Week 3)

#### 3.1 Install Excel Library
```bash
npm install xlsx
```

#### 3.2 Create Export API
```typescript
// app/api/reports/export/route.ts
import * as XLSX from 'xlsx'

export async function POST(req: Request) {
  const { reportType, dateRange } = await req.json()
  
  // Get report data
  const data = await generateReportData(reportType, dateRange)
  
  // Create workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  
  // Generate buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="report-${Date.now()}.xlsx"`
    }
  })
}
```

---

## 🧪 Testing

```typescript
// tests/features/reports.test.ts
describe('Dashboard', () => {
  it('should load summary data', async () => {
    const res = await fetch('/api/dashboard/summary')
    const data = await res.json()
    
    expect(data).toHaveProperty('total_invoices')
    expect(data).toHaveProperty('total_revenue')
  })
})

describe('Reports', () => {
  it('should generate sales report', async () => {
    const res = await fetch('/api/reports/sales?start_date=2024-01-01&end_date=2024-12-31')
    const data = await res.json()
    
    expect(data).toBeInstanceOf(Array)
    expect(data[0]).toHaveProperty('period')
    expect(data[0]).toHaveProperty('revenue')
  })
  
  it('should export to Excel', async () => {
    const res = await fetch('/api/reports/export', {
      method: 'POST',
      body: JSON.stringify({ reportType: 'sales' })
    })
    
    expect(res.headers.get('content-type')).toContain('spreadsheet')
  })
})
```

---

## 📈 Performance Optimization

### 1. Caching Strategy
```typescript
// Use React Query for client-side caching
import { useQuery } from '@tanstack/react-query'

const { data: summary } = useQuery({
  queryKey: ['dashboard', 'summary'],
  queryFn: fetchSummary,
  staleTime: 5 * 60 * 1000, // 5 minutes
})
```

### 2. Database Indexing
```sql
-- Add indexes for common queries
CREATE INDEX idx_invoices_date_status ON invoices(invoice_date, status);
CREATE INDEX idx_invoices_customer_date ON invoices(customer_name, invoice_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status = 'sent';
```

### 3. Report Caching
```typescript
// Cache expensive reports
const getCachedReport = async (type, filters) => {
  const cached = await supabase
    .from('report_cache')
    .select('data')
    .eq('report_type', type)
    .eq('filters', JSON.stringify(filters))
    .gt('expires_at', new Date().toISOString())
    .single()
  
  if (cached.data) return cached.data
  
  // Generate new report
  const report = await generateReport(type, filters)
  
  // Cache it
  await supabase.from('report_cache').insert({
    report_type: type,
    filters,
    data: report,
    expires_at: new Date(Date.now() + 3600000) // 1 hour
  })
  
  return report
}
```

---

## 🚀 Future Enhancements

### Phase 4: Advanced Features
- [ ] Drill-down reports (click to see details)
- [ ] Custom date presets (This Week, Last Month, etc.)
- [ ] Schedule reports (email daily/weekly)
- [ ] Report templates
- [ ] Comparison reports (vs. last year)
- [ ] Profit/Loss report (with expenses)
- [ ] Tax reports (VAT summary)
- [ ] PDF export for reports
- [ ] Share reports via link

---

## 📊 Success Metrics

### Technical KPIs
- Dashboard load time < 2s
- Report generation < 5s
- Cache hit rate > 70%
- API response time < 500ms

### Business KPIs
- Daily active users on dashboard
- Most viewed reports
- Export frequency
- User feedback score

---

**Last Updated:** March 2, 2026  
**Status:** 📝 Planning  
**Priority:** High  
**Estimated Effort:** 3 weeks

