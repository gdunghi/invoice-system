'use client'

import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'

interface DashboardSummary {
  total_invoices: number
  total_revenue: number
  paid_amount: number
  outstanding_amount: number
  overdue_amount: number
  overdue_count: number
}

interface RevenueTrendData {
  month: string
  revenue: number
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [trendData, setTrendData] = useState<RevenueTrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      // Check auth
      const user = await getCurrentUser()
      if (!user) {
        redirect('/login')
        return
      }

      // Get session for token
      const { getSession } = await import('@/lib/auth')
      const session = await getSession()

      if (!session?.access_token) {
        redirect('/login')
        return
      }

      // Load summary with auth header
      const summaryRes = await fetch('/api/dashboard/summary', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (!summaryRes.ok) {
        const errorData = await summaryRes.json()
        throw new Error(errorData.error || 'Failed to load summary')
      }
      const summaryData = await summaryRes.json()
      setSummary(summaryData)

      // Load trend data with auth header
      const trendRes = await fetch('/api/dashboard/revenue-trend?period=6months', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })
      if (trendRes.ok) {
        const trendJsonData = await trendRes.json()
        setTrendData(trendJsonData.data || [])
      }
    } catch (err: any) {
      setError(err.message)
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">Error Loading Dashboard</h2>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">No data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Business overview and analytics</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Revenue Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ฿{summary.total_revenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {summary.total_invoices} invoices
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
          </div>

          {/* Paid Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Paid Amount</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  ฿{summary.paid_amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {((summary.paid_amount / summary.total_revenue) * 100 || 0).toFixed(1)}%
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          {/* Overdue Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Overdue Amount</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">
                  ฿{summary.overdue_amount.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {summary.overdue_count} invoices
                </p>
              </div>
              <div className="text-4xl">⏰</div>
            </div>
          </div>
        </div>

        {/* Revenue Trend Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Revenue Trend (Last 6 Months)
          </h2>

          {trendData.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="flex items-end gap-4 min-w-full h-64">
                {trendData.map((item, idx) => {
                  const maxRevenue = Math.max(...trendData.map((d) => d.revenue))
                  const heightPercent = (item.revenue / maxRevenue) * 100

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center gap-2"
                    >
                      <div className="text-gray-600 text-xs font-semibold">
                        ฿{(item.revenue / 1000).toFixed(0)}K
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all hover:from-purple-700 hover:to-purple-500"
                        style={{ height: `${heightPercent}%` }}
                      ></div>
                      <div className="text-gray-600 text-xs mt-2">
                        {item.month.substring(5)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No revenue data available</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="flex gap-4 flex-wrap">
            <a
              href="/invoices/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              + New Invoice
            </a>
            <a
              href="/reports"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📊 View Reports
            </a>
            <a
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              📋 All Invoices
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

