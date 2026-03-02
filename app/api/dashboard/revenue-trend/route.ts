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
    const period = searchParams.get('period') || '6months'

    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('total, invoice_date')
      .order('invoice_date', { ascending: true })

    if (error) throw error

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({ data: [] })
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
          acc[monthKey] = { month: monthKey, revenue: 0 }
        }
        acc[monthKey].revenue += inv.total || 0
        return acc
      },
      {} as Record<string, { month: string; revenue: number }>
    )

    const data = Object.values(grouped)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        revenue: Math.round(item.revenue * 100) / 100,
      }))

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Revenue trend error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

