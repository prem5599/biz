import { useState, useEffect } from 'react';
import { useCurrentOrganization } from '../hooks/useOrganization';
import { useReports, useGenerateReport, useDeleteReport, useCleanupReports } from '../hooks/useReports';
import { useCurrency } from '../contexts/CurrencyContext';
import { showToast } from '../components/ui/toast-helper';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

import {
  FileText,
  Download,
  Calendar,
  Clock,
  Loader2,
  Trash2,
  RefreshCw,
  Plus,
  FileSpreadsheet,
} from 'lucide-react';

const reportTemplates = [
  {
    id: 'weekly',
    name: 'Weekly Business Summary',
    description: 'Key metrics and insights from the past week',
    frequency: 'Weekly',
    period: 'weekly',
  },
  {
    id: 'monthly',
    name: 'Monthly Performance Report',
    description: 'Comprehensive monthly business analysis',
    frequency: 'Monthly',
    period: 'monthly',
  },
  {
    id: 'customer',
    name: 'Customer Analysis Report',
    description: 'Deep dive into customer behavior and segments',
    frequency: 'On-demand',
    period: 'monthly',
  },
  {
    id: 'revenue',
    name: 'Revenue Breakdown',
    description: 'Detailed revenue analysis by source and product',
    frequency: 'On-demand',
    period: 'monthly',
  },
];

export default function ReportsPage() {
  const { organization } = useCurrentOrganization();
  const { currency } = useCurrency();
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'scheduled'>('generate');
  const [exportFormat, setExportFormat] = useState<string>('pdf');
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const { data: reports, isLoading: isLoadingReports, refetch } = useReports(
    organization?.id || null,
    20
  );
  const generateReportMutation = useGenerateReport();
  const deleteReportMutation = useDeleteReport();
  const cleanupMutation = useCleanupReports();

  const downloadBlob = (data: any, filename: string) => {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleGenerateReport = async (reportType: string, period: string) => {
    if (!organization?.id) return;

    const loadingToast = showToast.loading(
      `Generating ${reportType} report in ${exportFormat.toUpperCase()} format...`
    );

    setGeneratingReport(reportType);
    try {
      const response = await generateReportMutation.mutateAsync({
        organizationId: organization.id,
        reportType,
        period,
        currency,
        format: exportFormat,
      });

      downloadBlob(
        response,
        `${reportType}-report.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`
      );

      showToast.success(
        `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully! Download started.`,
        { id: loadingToast }
      );
      refetch();
    } catch (error) {
      console.error('Error generating report:', error);
      showToast.error(
        `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { id: loadingToast }
      );
    } finally {
      setGeneratingReport(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!organization?.id || !confirm('Are you sure you want to delete this report?')) return;
    try {
      await deleteReportMutation.mutateAsync({ id: reportId, organizationId: organization.id });
      showToast.success('Report deleted successfully');
      refetch();
    } catch {
      showToast.error('Failed to delete report');
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await cleanupMutation.mutateAsync();
      showToast.success(`Cleaned up expired reports`);
      refetch();
    } catch {
      showToast.error('Failed to cleanup expired reports');
    }
  };

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization Found</h2>
        <p className="text-gray-600">Please create an organization to generate reports.</p>
      </div>
    );
  }

  const generateQuickReport = () => handleGenerateReport('weekly', 'weekly');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600">Generate, manage, and download business reports</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={generateQuickReport} disabled={generatingReport === 'weekly'}>
            {generatingReport === 'weekly' ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Quick Report
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoadingReports}>
            {isLoadingReports ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleCleanup}
            className="text-orange-600 hover:text-orange-700"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Expired
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Reports</TabsTrigger>
          <TabsTrigger value="history">Report History ({reports?.length || 0})</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled (0)</TabsTrigger>
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
                        onClick={() => handleGenerateReport(template.id, template.period)}
                        disabled={generatingReport === template.id}
                      >
                        {generatingReport === template.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            {exportFormat === 'pdf' ? (
                              <FileText className="h-4 w-4 mr-1" />
                            ) : (
                              <FileSpreadsheet className="h-4 w-4 mr-1" />
                            )}
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
              {isLoadingReports ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p>Loading report history...</p>
                </div>
              ) : !reports || reports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
                  <p className="text-gray-600 mb-4">Generate your first report to see it here.</p>
                  <Button onClick={() => setActiveTab('generate')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report: any) => (
                    <div key={report.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium">{report.title}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span>{report.type}</span>
                            <span>•</span>
                            <span>{report.format}</span>
                            <span>•</span>
                            <span>
                              Generated {new Date(report.generatedAt).toLocaleDateString()}
                            </span>
                            {report.expiresAt && (
                              <>
                                <span>•</span>
                                <span>
                                  Expires {new Date(report.expiresAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          {report.periodStart && report.periodEnd && (
                            <p className="text-sm text-gray-500 mt-1">
                              Period: {new Date(report.periodStart).toLocaleDateString()} -{' '}
                              {new Date(report.periodEnd).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" />
                            Excel
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteReport(report.id)}
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Scheduled Reports Coming Soon
                </h3>
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
  );
}
