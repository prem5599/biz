'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useCurrentOrganization } from '@/hooks/useOrganization'
import { useCurrency } from '@/contexts/CurrencyContext'
import { FileText, Download, Calendar, Clock, BarChart3, Loader2, FileSpreadsheet, Trash2, Eye, RefreshCw, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { showToast } from '@/components/ui/toast-helper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Reports() {
  const { data: session, status } = useSession()
  const { organization, isLoading: orgLoading } = useCurrentOrganization()
  const { currency } = useCurrency()
  
  // All hooks must be called before any conditional returns
  const [isGenerating, setIsGenerating] = useState<string | null>(null)
  const [generatedReports, setGeneratedReports] = useState<any[]>([])
  const [exportFormat, setExportFormat] = useState<string>('pdf')
  const [reportHistory, setReportHistory] = useState<any[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [scheduledReports, setScheduledReports] = useState<any[]>([])
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'scheduled'>('generate')

  // Load report history
  const loadReportHistory = async () => {
    if (!organization?.id) return

    setIsLoadingHistory(true)
    try {
      const response = await fetch(`/api/reports?organizationId=${organization.id}&limit=20`)
      const data = await response.json()
      
      if (data.success) {
        setReportHistory(data.data.reports)
      } else {
        showToast.error('Failed to load report history')
      }
    } catch (error) {
      console.error('Error loading report history:', error)
      showToast.error('Failed to load report history')
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Load scheduled reports
  const loadScheduledReports = async () => {
    if (!organization?.id) return

    try {
      const response = await fetch(`/api/reports/schedule?organizationId=${organization.id}`)
      const data = await response.json()
      
      if (data.success) {
        setScheduledReports(data.data)
      }
    } catch (error) {
      console.error('Error loading scheduled reports:', error)
    }
  }

  // Delete report
  const deleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return

    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showToast.success('Report deleted successfully')
        loadReportHistory()
      } else {
        showToast.error('Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      showToast.error('Failed to delete report')
    }
  }

  // Download existing report
  const downloadReport = async (reportId: string, format: string, title: string) => {
    try {
      const response = await fetch(`/api/reports/${reportId}?format=${format}`)
      
      if (!response.ok) {
        throw new Error('Failed to download report')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${title.replace(/\s+/g, '_')}.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      showToast.success('Report downloaded successfully')
    } catch (error) {
      console.error('Error downloading report:', error)
      showToast.error('Failed to download report')
    }
  }

  const generateReport = async (reportType: string, period: string, format: string = 'pdf') => {
    if (!organization?.id) return

    // Show loading toast
    const loadingToast = showToast.loading(
      `🔄 Generating ${reportType} report in ${format.toUpperCase()} format...`
    )

    try {
      setIsGenerating(reportType)

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id,
          reportType,
          period,
          currency: currency,
          format
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          // If response is not JSON, use the text as error message
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      // Handle file download
      const blob = await response.blob()
      const contentHeader = response.headers.get('Content-Disposition')
      const filename = contentHeader?.split('filename=')[1]?.replace(/"/g, '') || `report.${format}`
      
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      // Success toast
      showToast.success(
        `✅ ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully! Download started.`,
        { id: loadingToast }
      )

      // Refresh report history to show the new report
      loadReportHistory()

    } catch (error) {
      console.error('Error generating report:', error)
      
      // Error toast
      showToast.error(
        `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: loadingToast }
      )
    } finally {
      setIsGenerating(null)
    }
  }

  // Generate quick report
  const generateQuickReport = () => {
    generateReport('weekly', 'weekly', exportFormat)
  }

  // Cleanup expired reports
  const cleanupExpiredReports = async () => {
    try {
      const response = await fetch('/api/reports/cleanup', {
        method: 'POST'
      })

      const data = await response.json()
      
      if (data.success) {
        showToast.success(`Cleaned up ${data.data.deletedCount} expired reports`)
        loadReportHistory() // Refresh the list
      } else {
        showToast.error('Failed to cleanup expired reports')
      }
    } catch (error) {
      console.error('Error cleaning up reports:', error)
      showToast.error('Failed to cleanup expired reports')
    }
  }

  // Load data on component mount
  useEffect(() => {
    if (organization?.id) {
      loadReportHistory()
      loadScheduledReports()
    }
  }, [organization?.id])

  if (status === 'loading' || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  if (!organization) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization Found</h2>
          <p className="text-gray-600">Please create an organization to continue.</p>
        </div>
      </div>
    )
  }

  const reportTemplates = [
    {
      id: 'weekly',
      name: 'Weekly Business Summary',
      description: 'Key metrics and insights from the past week',
      frequency: 'Weekly',
      period: 'weekly'
    },
    {
      id: 'monthly',
      name: 'Monthly Performance Report',
      description: 'Comprehensive monthly business analysis',
      frequency: 'Monthly',
      period: 'monthly'
    },
    {
      id: 'customer',
      name: 'Customer Analysis Report',
      description: 'Deep dive into customer behavior and segments',
      frequency: 'On-demand',
      period: 'monthly'
    },
    {
      id: 'revenue',
      name: 'Revenue Breakdown',
      description: 'Detailed revenue analysis by source and product',
      frequency: 'On-demand',
      period: 'monthly'
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
            <p className="text-gray-600">Generate, manage, and download business reports</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={generateQuickReport}
              disabled={isGenerating === 'weekly'}
              className="flex items-center space-x-2"
            >
              {isGenerating === 'weekly' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span>Quick Report</span>
            </Button>
            <Button 
              variant="outline"
              onClick={() => loadReportHistory()}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button 
              variant="outline"
              onClick={cleanupExpiredReports}
              className="text-orange-600 hover:text-orange-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Cleanup Expired
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generate">Generate Reports</TabsTrigger>
            <TabsTrigger value="history">Report History ({reportHistory.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled ({scheduledReports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {/* Export Format Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Export Format</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex-1">
                    <Select value={exportFormat} onValueChange={setExportFormat}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select export format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF with BizInsights Watermark</SelectItem>
                        <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                        <SelectItem value="csv">CSV File</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-gray-500">
                    {exportFormat === 'pdf' && 'Professional PDF with tables and branding'}
                    {exportFormat === 'excel' && 'Excel file with multiple sheets'}
                    {exportFormat === 'csv' && 'Comma-separated values for data analysis'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Report Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Report Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportTemplates.map((template) => (
                    <div key={template.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{template.name}</h3>
                          <p className="text-sm text-gray-600">{template.description}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {template.frequency}
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="flex-1" 
                          onClick={() => generateReport(template.id, template.period, exportFormat)}
                          disabled={isGenerating === template.id}
                        >
                          {isGenerating === template.id ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              {exportFormat === 'pdf' ? <FileText className="h-4 w-4 mr-1" /> :
                               <FileSpreadsheet className="h-4 w-4 mr-1" />}
                              Generate {exportFormat.toUpperCase()}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Report History</CardTitle>
                <p className="text-sm text-gray-600">View and download previously generated reports</p>
              </CardHeader>
              <CardContent>
                {isLoadingHistory ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading report history...</p>
                  </div>
                ) : reportHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
                    <p className="text-gray-600 mb-4">
                      Generate your first report to see it here.
                    </p>
                    <Button onClick={() => setActiveTab('generate')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportHistory.map((report) => (
                      <div key={report.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium">{report.title}</h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                              <span>{report.type}</span>
                              <span>•</span>
                              <span>{report.format}</span>
                              <span>•</span>
                              <span>Generated {new Date(report.generatedAt).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>Expires {new Date(report.expiresAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              Period: {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadReport(report.id, 'pdf', report.title)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadReport(report.id, 'excel', report.title)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Excel
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteReport(report.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled Reports</CardTitle>
                <p className="text-sm text-gray-600">Manage automated report generation</p>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Scheduled Reports Coming Soon</h3>
                  <p className="text-gray-600 mb-4">
                    Set up automated report generation and delivery to your email.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 text-sm text-gray-500">
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Daily Reports</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Weekly Summaries</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Monthly Analytics</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-full">Email Delivery</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}