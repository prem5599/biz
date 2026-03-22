import * as XLSX from 'xlsx'
import { createObjectCsvWriter } from 'csv-writer'
import { tmpdir } from 'os'
import { join } from 'path'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { ReportContent } from './report-service'

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf'
  includeCharts?: boolean
  watermark?: string
}

export class ExportService {
  static async exportReport(reportContent: ReportContent, options: ExportOptions): Promise<Buffer> {
    switch (options.format) {
      case 'csv':
        return this.exportToCSV(reportContent)
      case 'excel':
        return this.exportToExcel(reportContent)
      case 'pdf':
        return this.exportToPDF(reportContent, options.watermark)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  private static async exportToCSV(reportContent: ReportContent): Promise<Buffer> {
    const tempFile = join(tmpdir(), `report_${Date.now()}.csv`)
    
    try {
      // Extract data for CSV export
      const csvData = this.extractDataForCSV(reportContent)
      
      const csvWriter = createObjectCsvWriter({
        path: tempFile,
        header: csvData.headers
      })

      await csvWriter.writeRecords(csvData.records)
      const buffer = readFileSync(tempFile)
      
      return buffer
    } finally {
      try {
        unlinkSync(tempFile)
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private static async exportToExcel(reportContent: ReportContent): Promise<Buffer> {
    const workbook = XLSX.utils.book_new()

    // Create summary sheet
    const summaryData = [
      ['Report Title', reportContent.title],
      ['Organization', reportContent.organization.name],
      ['Period', `${reportContent.period.start} to ${reportContent.period.end}`],
      ['Generated At', new Date(reportContent.generatedAt).toLocaleString()],
      ['Currency', reportContent.currency],
      [''],
      ['Executive Summary'],
      [reportContent.executiveSummary],
      ['']
    ]

    // Add key metrics
    summaryData.push(['Key Metrics'])
    if (reportContent.keyMetrics.revenue) {
      summaryData.push(['Total Revenue', reportContent.keyMetrics.revenue.formatted])
    }
    if (reportContent.keyMetrics.orders) {
      summaryData.push(['Total Orders', reportContent.keyMetrics.orders.total])
      summaryData.push(['Average Order Value', reportContent.keyMetrics.orders.averageValueFormatted])
    }
    if (reportContent.keyMetrics.customers) {
      summaryData.push(['Total Customers', reportContent.keyMetrics.customers.total])
      summaryData.push(['New Customers', reportContent.keyMetrics.customers.new])
      summaryData.push(['Customer Retention Rate', `${reportContent.keyMetrics.customers.retentionRate.toFixed(1)}%`])
    }

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summaryWs, 'Summary')

    // Create detailed sections sheets
    reportContent.sections.forEach((section, index) => {
      const sectionData = this.extractSectionDataForExcel(section)
      if (sectionData.length > 0) {
        const ws = XLSX.utils.aoa_to_sheet(sectionData)
        const sheetName = section.title.substring(0, 31) // Excel sheet name limit
        XLSX.utils.book_append_sheet(workbook, ws, sheetName)
      }
    })

    // Create recommendations sheet
    if (reportContent.recommendations && reportContent.recommendations.length > 0) {
      const recommendationsData = [
        ['Recommendations'],
        [''],
        ...reportContent.recommendations.map((rec, index) => [`${index + 1}. ${rec}`])
      ]
      const recWs = XLSX.utils.aoa_to_sheet(recommendationsData)
      XLSX.utils.book_append_sheet(workbook, recWs, 'Recommendations')
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }

  private static async exportToPDF(reportContent: ReportContent, watermark?: string): Promise<Buffer> {
    // Dynamic import to avoid SSR issues
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default

    const doc = new jsPDF()
    let currentY = 20

    // Add watermark
    if (watermark) {
      doc.setTextColor(200, 200, 200)
      doc.setFontSize(50)
      doc.text(watermark, 105, 150, { 
        align: 'center', 
        angle: 45,
        maxWidth: 200 
      })
      doc.setTextColor(0, 0, 0) // Reset text color
    }

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(reportContent.title, 20, currentY)
    currentY += 10

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`${reportContent.organization.name}`, 20, currentY)
    currentY += 6
    doc.text(`Period: ${reportContent.period.start} to ${reportContent.period.end}`, 20, currentY)
    currentY += 6
    doc.text(`Generated: ${new Date(reportContent.generatedAt).toLocaleString()}`, 20, currentY)
    currentY += 15

    // Executive Summary
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', 20, currentY)
    currentY += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    const summaryLines = doc.splitTextToSize(reportContent.executiveSummary, 170)
    doc.text(summaryLines, 20, currentY)
    currentY += summaryLines.length * 5 + 10

    // Key Metrics Table
    if (reportContent.keyMetrics) {
      const metricsData = this.prepareKeyMetricsForPDF(reportContent.keyMetrics)
      
      if (metricsData.length > 0) {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Key Metrics', 20, currentY)
        currentY += 5

        autoTable(doc, {
          startY: currentY,
          head: [['Metric', 'Value']],
          body: metricsData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 20, right: 20 }
        })

        currentY = (doc as any).lastAutoTable.finalY + 15
      }
    }

    // Sections
    for (const section of reportContent.sections) {
      // Check if we need a new page
      if (currentY > 250) {
        doc.addPage()
        currentY = 20
        
        // Add watermark to new page
        if (watermark) {
          doc.setTextColor(200, 200, 200)
          doc.setFontSize(50)
          doc.text(watermark, 105, 150, { 
            align: 'center', 
            angle: 45,
            maxWidth: 200 
          })
          doc.setTextColor(0, 0, 0)
        }
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text(section.title, 20, currentY)
      currentY += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const contentLines = doc.splitTextToSize(section.content, 170)
      doc.text(contentLines, 20, currentY)
      currentY += contentLines.length * 5 + 5

      // Add section data as table if available
      const sectionTableData = this.prepareSectionDataForPDF(section)
      if (sectionTableData.headers && sectionTableData.body.length > 0) {
        autoTable(doc, {
          startY: currentY,
          head: [sectionTableData.headers],
          body: sectionTableData.body,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 20, right: 20 }
        })
        currentY = (doc as any).lastAutoTable.finalY + 10
      } else {
        currentY += 5
      }
    }

    // Recommendations
    if (reportContent.recommendations && reportContent.recommendations.length > 0) {
      if (currentY > 220) {
        doc.addPage()
        currentY = 20
        
        // Add watermark to new page
        if (watermark) {
          doc.setTextColor(200, 200, 200)
          doc.setFontSize(50)
          doc.text(watermark, 105, 150, { 
            align: 'center', 
            angle: 45,
            maxWidth: 200 
          })
          doc.setTextColor(0, 0, 0)
        }
      }

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Recommendations', 20, currentY)
      currentY += 8

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      reportContent.recommendations.forEach((rec, index) => {
        const recText = `${index + 1}. ${rec}`
        const recLines = doc.splitTextToSize(recText, 170)
        doc.text(recLines, 20, currentY)
        currentY += recLines.length * 5 + 3
      })
    }

    // Footer with BizInsights branding
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text('Generated by BizInsights', 20, doc.internal.pageSize.height - 10)
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 40, doc.internal.pageSize.height - 10)
    }

    return Buffer.from(doc.output('arraybuffer'))
  }

  private static extractDataForCSV(reportContent: ReportContent) {
    const headers = [
      { id: 'metric', title: 'Metric' },
      { id: 'value', title: 'Value' },
      { id: 'section', title: 'Section' }
    ]

    const records: any[] = []

    // Add key metrics
    if (reportContent.keyMetrics.revenue) {
      records.push({
        metric: 'Total Revenue',
        value: reportContent.keyMetrics.revenue.formatted,
        section: 'Key Metrics'
      })
    }
    
    if (reportContent.keyMetrics.orders) {
      records.push({
        metric: 'Total Orders',
        value: reportContent.keyMetrics.orders.total,
        section: 'Key Metrics'
      })
      records.push({
        metric: 'Average Order Value',
        value: reportContent.keyMetrics.orders.averageValueFormatted,
        section: 'Key Metrics'
      })
    }

    if (reportContent.keyMetrics.customers) {
      records.push({
        metric: 'Total Customers',
        value: reportContent.keyMetrics.customers.total,
        section: 'Key Metrics'
      })
      records.push({
        metric: 'New Customers',
        value: reportContent.keyMetrics.customers.new,
        section: 'Key Metrics'
      })
      records.push({
        metric: 'Customer Retention Rate',
        value: `${reportContent.keyMetrics.customers.retentionRate.toFixed(1)}%`,
        section: 'Key Metrics'
      })
    }

    // Add section data
    reportContent.sections.forEach(section => {
      if (section.data) {
        Object.entries(section.data).forEach(([key, value]) => {
          if (typeof value === 'number' || typeof value === 'string') {
            records.push({
              metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
              value: value,
              section: section.title
            })
          }
        })
      }
    })

    return { headers, records }
  }

  private static extractSectionDataForExcel(section: any): any[][] {
    const data: any[][] = []
    
    data.push([section.title])
    data.push([section.content])
    data.push([''])

    if (section.data) {
      data.push(['Data'])
      Object.entries(section.data).forEach(([key, value]) => {
        if (typeof value === 'number' || typeof value === 'string') {
          data.push([
            key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value
          ])
        } else if (Array.isArray(value) && value.length > 0) {
          data.push([key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())])
          
          if (typeof value[0] === 'object') {
            // Handle array of objects
            const headers = Object.keys(value[0])
            data.push(headers)
            value.forEach(item => {
              data.push(headers.map(header => item[header] || ''))
            })
          } else {
            // Handle array of primitives
            value.forEach(item => {
              data.push([item])
            })
          }
          data.push([''])
        }
      })
    }

    return data
  }

  private static prepareKeyMetricsForPDF(keyMetrics: any): string[][] {
    const data: string[][] = []

    if (keyMetrics.revenue) {
      data.push(['Total Revenue', keyMetrics.revenue.formatted])
    }
    
    if (keyMetrics.orders) {
      data.push(['Total Orders', keyMetrics.orders.total.toString()])
      data.push(['Average Order Value', keyMetrics.orders.averageValueFormatted])
    }

    if (keyMetrics.customers) {
      data.push(['Total Customers', keyMetrics.customers.total.toString()])
      data.push(['New Customers', keyMetrics.customers.new.toString()])
      data.push(['Customer Retention Rate', `${keyMetrics.customers.retentionRate.toFixed(1)}%`])
    }

    if (keyMetrics.performance) {
      data.push(['Conversion Rate', `${keyMetrics.performance.conversionRate.toFixed(2)}%`])
      if (keyMetrics.performance.costPerAcquisition > 0) {
        data.push(['Cost Per Acquisition', `$${keyMetrics.performance.costPerAcquisition.toFixed(2)}`])
      }
    }

    return data
  }

  private static prepareSectionDataForPDF(section: any): { headers: string[], body: string[][] } {
    if (!section.data) {
      return { headers: [], body: [] }
    }

    const headers: string[] = []
    const body: string[][] = []

    // Handle different data structures
    if (section.data.topProducts && Array.isArray(section.data.topProducts)) {
      headers.push('Product Name', 'Revenue', 'Quantity')
      section.data.topProducts.slice(0, 10).forEach((product: any) => {
        body.push([
          product.name || 'N/A',
          `$${(product.revenue || 0).toFixed(2)}`,
          (product.quantity || 0).toString()
        ])
      })
    } else if (section.data.revenueBySource && Array.isArray(section.data.revenueBySource)) {
      headers.push('Source', 'Revenue')
      section.data.revenueBySource.forEach((source: any) => {
        body.push([
          source.source || 'N/A',
          `$${(source.revenue || 0).toFixed(2)}`
        ])
      })
    } else if (section.data.dailyRevenueTrend && Array.isArray(section.data.dailyRevenueTrend)) {
      headers.push('Date', 'Revenue')
      section.data.dailyRevenueTrend.slice(0, 15).forEach((trend: any) => {
        body.push([
          trend.date || 'N/A',
          `$${(trend.revenue || 0).toFixed(2)}`
        ])
      })
    } else {
      // Generic object data
      const entries = Object.entries(section.data).filter(([key, value]) => 
        typeof value === 'number' || typeof value === 'string'
      )
      
      if (entries.length > 0) {
        headers.push('Metric', 'Value')
        entries.forEach(([key, value]) => {
          body.push([
            key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value.toString()
          ])
        })
      }
    }

    return { headers, body }
  }
}