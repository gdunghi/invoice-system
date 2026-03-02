import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

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

    // Get all invoices
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, total, status, due_date, created_at')
      .order('created_at', { ascending: false })

    if (error) throw error

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        total_invoices: 0,
        total_revenue: 0,
        paid_amount: 0,
        outstanding_amount: 0,
        overdue_amount: 0,
        overdue_count: 0,
      })
    }

    const now = new Date()

    const summary = {
      total_invoices: invoices.length,
      total_revenue: Math.round(
        invoices.reduce((sum, inv) => sum + (inv.total || 0), 0) * 100
      ) / 100,
      paid_amount: Math.round(
        invoices
          .filter((inv) => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total || 0), 0) * 100
      ) / 100,
      outstanding_amount: Math.round(
        invoices
          .filter((inv) => inv.status !== 'paid')
          .reduce((sum, inv) => sum + (inv.total || 0), 0) * 100
      ) / 100,
      overdue_amount: Math.round(
        invoices
          .filter(
            (inv) =>
              inv.status === 'sent' &&
              inv.due_date &&
              new Date(inv.due_date) < now
          )
          .reduce((sum, inv) => sum + (inv.total || 0), 0) * 100
      ) / 100,
      overdue_count: invoices.filter(
        (inv) =>
          inv.status === 'sent' &&
          inv.due_date &&
          new Date(inv.due_date) < now
      ).length,
    }

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Dashboard summary error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

