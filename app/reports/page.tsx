'use client'

import { useState } from 'react'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

interface ReportData {
  period: string
  invoices: number
  revenue: number
  paid: number
}

interface ReportResponse {
  report_type: string
  period: { start: string; end: string }
  data: ReportData[]
  summary: {
    total_invoices: number
    total_revenue: number
    avg_per_month: number
  }
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState('sales')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [reportData, setReportData] = useState<ReportResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const user = await getCurrentUser()
    if (!user) {
      redirect('/login')
    }
  }

  async function handleGenerateReport() {
    setLoading(true)
    setError('')

    try {
      // Get session for token
      const { getSession } = await import('@/lib/auth')
      const session = await getSession()

      if (!session?.access_token) {
        setError('Session expired. Please login again.')
        setLoading(false)
        return
      }

      const res = await fetch(
        `/api/reports/${reportType}?start_date=${dateRange.start}&end_date=${dateRange.end}&group_by=month`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to generate report')
      }

      const data = await res.json()
      setReportData(data)
    } catch (err: any) {
      setError(err.message)
      console.error('Report error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleExport() {
    if (!reportData) return

    setLoading(true)
    try {
      // Get session for token
      const { getSession } = await import('@/lib/auth')
      const session = await getSession()

      if (!session?.access_token) {
        setError('Session expired. Please login again.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          reportType,
          dateRange,
          data: reportData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Export failed')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-${reportType}-${Date.now()}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600 mt-2">Analyze sales and customer data</p>
          </div>
          <div className="flex gap-3">
            <a
              href="/"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              📋 All Invoices
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              📊 Dashboard
            </a>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="sales">Sales Report</option>
                <option value="customers">Customer Report</option>
                <option value="overdue">Overdue Report</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, start: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) =>
                  setDateRange((prev) => ({ ...prev, end: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Generate Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Report Display */}
        {reportData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {reportType === 'sales' && 'Sales Report'}
                  {reportType === 'customers' && 'Customer Report'}
                  {reportType === 'overdue' && 'Overdue Report'}
                </h2>
                <p className="text-gray-600 text-sm mt-1">
                  {reportData.period.start} to {reportData.period.end}
                </p>
              </div>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                📥 Export Excel
              </button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">
                  {reportData.summary.total_invoices}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  ฿{reportData.summary.total_revenue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-600 text-sm">Avg per Month</p>
                <p className="text-2xl font-bold text-gray-900">
                  ฿{reportData.summary.avg_per_month.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                      Invoices
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Total Revenue
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Paid Amount
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {row.period}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {row.invoices}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        ฿{row.revenue.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-green-600">
                        ฿{row.paid.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-orange-600">
                        ฿
                        {(row.revenue - row.paid).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!reportData && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">
              👆 Select filters and click &quot;Generate Report&quot; to view data
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


