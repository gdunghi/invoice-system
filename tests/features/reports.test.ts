import { describe, expect, it, beforeEach, vi } from 'vitest'

const mockFrom = vi.hoisted(() => vi.fn())
const mockSelect = vi.hoisted(() => vi.fn())
const mockOrder = vi.hoisted(() => vi.fn())
const mockGte = vi.hoisted(() => vi.fn())
const mockLte = vi.hoisted(() => vi.fn())

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom(),
  },
}))

import { describe as testDescribe } from 'vitest'

describe('Dashboard & Reports', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Dashboard Summary', () => {
    it('should calculate total revenue correctly', () => {
      const invoices = [
        { id: '1', total: 1000, status: 'paid', due_date: '2024-03-15' },
        { id: '2', total: 2000, status: 'sent', due_date: '2024-04-15' },
        { id: '3', total: 3000, status: 'sent', due_date: '2024-05-15' },
      ]

      const total = invoices.reduce((sum, inv) => sum + inv.total, 0)
      expect(total).toBe(6000)
    })

    it('should calculate paid amount correctly', () => {
      const invoices = [
        { total: 1000, status: 'paid' },
        { total: 2000, status: 'sent' },
        { total: 3000, status: 'paid' },
      ]

      const paid = invoices
        .filter((inv) => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.total, 0)
      expect(paid).toBe(4000)
    })

    it('should calculate overdue count correctly', () => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const futureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)

      const invoices = [
        { total: 1000, status: 'sent', due_date: pastDate.toISOString() },
        { total: 2000, status: 'sent', due_date: futureDate.toISOString() },
        { total: 3000, status: 'paid', due_date: pastDate.toISOString() },
      ]

      const overdue = invoices.filter(
        (inv) => inv.status === 'sent' && new Date(inv.due_date) < now
      ).length

      expect(overdue).toBe(1)
    })
  })

  describe('Revenue Trend', () => {
    it('should group invoices by month', () => {
      const invoices = [
        {
          total: 1000,
          invoice_date: '2024-01-15',
        },
        {
          total: 2000,
          invoice_date: '2024-01-20',
        },
        {
          total: 3000,
          invoice_date: '2024-02-15',
        },
      ]

      const grouped = invoices.reduce(
        (acc, inv) => {
          const month = new Date(inv.invoice_date).toLocaleDateString(
            'en-US',
            {
              year: 'numeric',
              month: '2-digit',
            }
          )

          if (!acc[month]) {
            acc[month] = { month, revenue: 0 }
          }
          acc[month].revenue += inv.total
          return acc
        },
        {} as Record<string, { month: string; revenue: number }>
      )

      expect(Object.keys(grouped).length).toBe(2)
      expect(grouped['2024-01'].revenue).toBe(3000)
      expect(grouped['2024-02'].revenue).toBe(3000)
    })
  })

  describe('Sales Report', () => {
    it('should calculate paid vs outstanding correctly', () => {
      const data = [
        { period: '2024-01', invoices: 5, revenue: 10000, paid: 8000 },
        { period: '2024-02', invoices: 3, revenue: 6000, paid: 6000 },
      ]

      const outstanding = data.map((item) => ({
        ...item,
        outstanding: item.revenue - item.paid,
      }))

      expect(outstanding[0].outstanding).toBe(2000)
      expect(outstanding[1].outstanding).toBe(0)
    })

    it('should calculate average per month', () => {
      const summary = {
        total_invoices: 8,
        total_revenue: 16000,
        data_points: 2,
      }

      const avgPerMonth = summary.total_revenue / summary.data_points
      expect(avgPerMonth).toBe(8000)
    })
  })

  describe('Data Export', () => {
    it('should prepare data for Excel export', () => {
      const reportData = [
        { period: '2024-01', invoices: 5, revenue: 10000, paid: 8000 },
        { period: '2024-02', invoices: 3, revenue: 6000, paid: 6000 },
      ]

      const exportData = reportData.map((row) => ({
        Period: row.period,
        Invoices: row.invoices,
        'Total Revenue': row.revenue,
        'Paid Amount': row.paid,
        Outstanding: row.revenue - row.paid,
      }))

      expect(exportData[0]).toEqual({
        Period: '2024-01',
        Invoices: 5,
        'Total Revenue': 10000,
        'Paid Amount': 8000,
        Outstanding: 2000,
      })
    })
  })
})

