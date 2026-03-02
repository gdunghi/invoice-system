import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// Mark as dynamic since we access request.headers
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify token with Supabase
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'start_date and end_date are required' },
        { status: 400 }
      )
    }

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('total, invoice_date, status')
      .gte('invoice_date', startDate)
      .lte('invoice_date', endDate)
      .order('invoice_date', { ascending: true })

    if (error) throw error

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        report_type: 'sales',
        period: { start: startDate, end: endDate },
        data: [],
        summary: {
          total_invoices: 0,
          total_revenue: 0,
          avg_per_month: 0,
        },
      })
    }

    // Group by month
    const grouped = invoices.reduce(
      (acc, inv) => {
        if (!inv.invoice_date) return acc

        const date = new Date(inv.invoice_date)
        const monthKey = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: '2-digit',
        })

        if (!acc[monthKey]) {
          acc[monthKey] = {
            period: monthKey,
            invoices: 0,
            revenue: 0,
            paid: 0,
          }
        }
        acc[monthKey].invoices += 1
        acc[monthKey].revenue += inv.total || 0
        if (inv.status === 'paid') {
          acc[monthKey].paid += inv.total || 0
        }
        return acc
      },
      {} as Record<
        string,
        { period: string; invoices: number; revenue: number; paid: number }
      >
    )

    const data = Object.values(grouped)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((item) => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
        paid: Math.round(item.paid * 100) / 100,
      }))

    const totalRevenue = Math.round(
      invoices.reduce((sum, inv) => sum + (inv.total || 0), 0) * 100
    ) / 100

    return NextResponse.json({
      report_type: 'sales',
      period: { start: startDate, end: endDate },
      data,
      summary: {
        total_invoices: invoices.length,
        total_revenue: totalRevenue,
        avg_per_month: Math.round((totalRevenue / data.length) * 100) / 100,
      },
    })
  } catch (error: any) {
    console.error('Sales report error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}


