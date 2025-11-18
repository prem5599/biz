import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ReportContent, ChartData } from './report-service'
import { formatCurrency } from './currency'

export class PDFGenerator {
  private doc: jsPDF
  private y: number = 20
  private pageWidth: number
  private pageHeight: number
  private margin: number = 20

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
  }

  async generateReportPDF(report: ReportContent): Promise<Buffer> {
    // Reset position
    this.y = this.margin

    // Add header
    this.addHeader(report)

    // Add executive summary
    this.addExecutiveSummary(report)

    // Add key metrics
    this.addKeyMetrics(report)

    // Add sections
    for (const section of report.sections) {
      this.checkPageBreak(40)
      this.addSection(section)
    }

    // Add insights if included
    if (report.insights && report.insights.length > 0) {
      this.checkPageBreak(60)
      this.addInsights(report.insights)
    }

    // Add forecast if included
    if (report.forecast && report.forecast.length > 0) {
      this.checkPageBreak(60)
      this.addForecast(report.forecast)
    }

    // Add recommendations
    if (report.recommendations && report.recommendations.length > 0) {
      this.checkPageBreak(50)
      this.addRecommendations(report.recommendations)
    }

    // Add footer with metadata
    this.addFooter(report)

    // Return PDF as buffer
    return Buffer.from(this.doc.output('arraybuffer'))
  }

  private addHeader(report: ReportContent) {
    // Company logo area (placeholder)
    this.doc.setFillColor(59, 130, 246) // Primary blue
    this.doc.rect(this.margin, this.y, 40, 15, 'F')

    this.doc.setFontSize(12)
    this.doc.setTextColor(255, 255, 255)
    this.doc.text('BizInsights', this.margin + 5, this.y + 10)

    // Report title
    this.doc.setFontSize(24)
    this.doc.setTextColor(31, 41, 55) // Dark gray
    this.doc.text(report.title, this.margin, this.y + 30)

    this.doc.setFontSize(12)
    this.doc.setTextColor(107, 114, 128) // Medium gray
    this.doc.text(report.subtitle, this.margin, this.y + 38)

    // Organization and period info
    this.doc.setFontSize(10)
    this.doc.text(`Organization: ${report.organization.name}`, this.margin, this.y + 46)
    this.doc.text(`Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}`, this.margin, this.y + 52)
    this.doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, this.margin, this.y + 58)

    // Divider line
    this.doc.setDrawColor(229, 231, 235)
    this.doc.line(this.margin, this.y + 65, this.pageWidth - this.margin, this.y + 65)

    this.y += 75
  }

  private addExecutiveSummary(report: ReportContent) {
    this.doc.setFontSize(16)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('Executive Summary', this.margin, this.y)

    this.y += 8

    this.doc.setFontSize(10)
    this.doc.setTextColor(55, 65, 81)

    const summaryLines = this.doc.splitTextToSize(report.executiveSummary, this.pageWidth - 2 * this.margin)
    summaryLines.forEach((line: string) => {
      this.checkPageBreak(8)
      this.doc.text(line, this.margin, this.y)
      this.y += 5
    })

    this.y += 10
  }

  private addKeyMetrics(report: ReportContent) {
    this.doc.setFontSize(16)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('Key Metrics', this.margin, this.y)

    this.y += 10

    // Create metrics grid
    const metricsArray = Object.entries(report.keyMetrics)
    const cols = 2
    const cellWidth = (this.pageWidth - 2 * this.margin - 10) / cols
    const cellHeight = 20

    metricsArray.forEach((metric, index) => {
      const [key, value] = metric
      const col = index % cols
      const row = Math.floor(index / cols)
      const x = this.margin + col * (cellWidth + 5)
      const y = this.y + row * (cellHeight + 5)

      this.checkPageBreak(cellHeight + 5)

      // Draw metric card
      this.doc.setFillColor(249, 250, 251)
      this.doc.setDrawColor(229, 231, 235)
      this.doc.rect(x, y, cellWidth, cellHeight, 'FD')

      // Metric label
      this.doc.setFontSize(9)
      this.doc.setTextColor(107, 114, 128)
      this.doc.text(this.formatMetricLabel(key), x + 3, y + 6)

      // Metric value
      this.doc.setFontSize(14)
      this.doc.setTextColor(31, 41, 55)
      const displayValue = this.formatMetricValue(key, value, report.currency)
      this.doc.text(displayValue, x + 3, y + 15)
    })

    const rows = Math.ceil(metricsArray.length / cols)
    this.y += rows * (cellHeight + 5) + 10
  }

  private addSection(section: any) {
    // Section title
    this.doc.setFontSize(14)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text(section.title, this.margin, this.y)

    this.y += 8

    // Section content
    if (section.content) {
      this.doc.setFontSize(10)
      this.doc.setTextColor(55, 65, 81)
      const contentLines = this.doc.splitTextToSize(section.content, this.pageWidth - 2 * this.margin)
      contentLines.forEach((line: string) => {
        this.checkPageBreak(8)
        this.doc.text(line, this.margin, this.y)
        this.y += 5
      })
      this.y += 5
    }

    // Add table data if available
    if (section.data && typeof section.data === 'object' && !Array.isArray(section.data)) {
      this.checkPageBreak(30)
      this.addDataTable(section.data)
    }

    // Add insights if available
    if (section.insights && section.insights.length > 0) {
      this.checkPageBreak(20)
      this.addSectionInsights(section.insights)
    }

    this.y += 10
  }

  private addDataTable(data: Record<string, any>) {
    const tableData = Object.entries(data).map(([key, value]) => [
      this.formatMetricLabel(key),
      typeof value === 'number' ? value.toLocaleString() : String(value)
    ])

    autoTable(this.doc, {
      startY: this.y,
      head: [['Metric', 'Value']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [55, 65, 81]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: this.margin, right: this.margin }
    })

    this.y = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addSectionInsights(insights: string[]) {
    this.doc.setFontSize(11)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('Key Insights:', this.margin, this.y)

    this.y += 6

    insights.forEach((insight, index) => {
      this.checkPageBreak(10)
      this.doc.setFontSize(9)
      this.doc.setTextColor(55, 65, 81)

      const lines = this.doc.splitTextToSize(`• ${insight}`, this.pageWidth - 2 * this.margin - 5)
      lines.forEach((line: string) => {
        this.checkPageBreak(5)
        this.doc.text(line, this.margin + 2, this.y)
        this.y += 5
      })
    })

    this.y += 5
  }

  private addInsights(insights: any[]) {
    this.doc.setFontSize(16)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('AI-Powered Insights', this.margin, this.y)

    this.y += 10

    insights.slice(0, 10).forEach((insight, index) => {
      this.checkPageBreak(25)

      // Insight card
      this.doc.setFillColor(249, 250, 251)
      this.doc.setDrawColor(229, 231, 235)
      const cardHeight = 18
      this.doc.rect(this.margin, this.y, this.pageWidth - 2 * this.margin, cardHeight, 'FD')

      // Impact badge
      const impactColor = this.getImpactColor(insight.impactScore || 5)
      this.doc.setFillColor(...impactColor)
      this.doc.circle(this.margin + 5, this.y + 5, 2, 'F')

      // Title
      this.doc.setFontSize(10)
      this.doc.setTextColor(31, 41, 55)
      this.doc.text(insight.title || 'Insight', this.margin + 10, this.y + 6)

      // Description
      this.doc.setFontSize(8)
      this.doc.setTextColor(75, 85, 99)
      const desc = this.doc.splitTextToSize(
        insight.description || '',
        this.pageWidth - 2 * this.margin - 12
      )
      this.doc.text(desc[0] || '', this.margin + 10, this.y + 12)

      // Impact score
      this.doc.setFontSize(8)
      this.doc.setTextColor(107, 114, 128)
      this.doc.text(
        `Impact: ${insight.impactScore || 5}/10`,
        this.pageWidth - this.margin - 25,
        this.y + 6
      )

      this.y += cardHeight + 3
    })

    this.y += 5
  }

  private addForecast(forecast: any[]) {
    this.doc.setFontSize(16)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('Revenue Forecast', this.margin, this.y)

    this.y += 10

    const forecastData = forecast.slice(0, 6).map((item: any) => [
      new Date(item.date || item.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      formatCurrency(item.predicted || item.value || 0, 'USD'),
      `${Math.round((item.confidence || 0.8) * 100)}%`,
      item.trend || 'stable'
    ])

    autoTable(this.doc, {
      startY: this.y,
      head: [['Period', 'Forecast', 'Confidence', 'Trend']],
      body: forecastData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      margin: { left: this.margin, right: this.margin }
    })

    this.y = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addRecommendations(recommendations: string[]) {
    this.doc.setFontSize(16)
    this.doc.setTextColor(31, 41, 55)
    this.doc.text('Recommendations', this.margin, this.y)

    this.y += 10

    recommendations.forEach((recommendation, index) => {
      this.checkPageBreak(15)

      // Number badge
      this.doc.setFillColor(59, 130, 246)
      this.doc.circle(this.margin + 3, this.y - 2, 3, 'F')
      this.doc.setFontSize(9)
      this.doc.setTextColor(255, 255, 255)
      this.doc.text(String(index + 1), this.margin + 1.5, this.y + 1)

      // Recommendation text
      this.doc.setFontSize(10)
      this.doc.setTextColor(31, 41, 55)
      const lines = this.doc.splitTextToSize(recommendation, this.pageWidth - 2 * this.margin - 10)
      lines.forEach((line: string, lineIndex: number) => {
        this.checkPageBreak(6)
        this.doc.text(line, this.margin + 10, this.y)
        if (lineIndex < lines.length - 1) this.y += 5
      })

      this.y += 10
    })
  }

  private addFooter(report: ReportContent) {
    // Add footer to all pages
    const pageCount = (this.doc as any).internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)

      // Footer line
      this.doc.setDrawColor(229, 231, 235)
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15)

      // Footer text
      this.doc.setFontSize(8)
      this.doc.setTextColor(107, 114, 128)
      this.doc.text(
        `Generated by BizInsights • ${new Date(report.generatedAt).toLocaleDateString()}`,
        this.margin,
        this.pageHeight - 10
      )

      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth - this.margin - 20,
        this.pageHeight - 10
      )
    }
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.y + requiredSpace > this.pageHeight - 25) {
      this.doc.addPage()
      this.y = this.margin
    }
  }

  private formatMetricLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  private formatMetricValue(key: string, value: any, currency: string): string {
    if (typeof value !== 'number') {
      return String(value)
    }

    const lowerKey = key.toLowerCase()

    if (lowerKey.includes('revenue') || lowerKey.includes('value') || lowerKey.includes('price')) {
      return formatCurrency(value, currency)
    }

    if (lowerKey.includes('rate') || lowerKey.includes('percentage')) {
      return `${(value * 100).toFixed(1)}%`
    }

    if (lowerKey.includes('count') || lowerKey.includes('total') || lowerKey.includes('orders')) {
      return value.toLocaleString()
    }

    return value.toLocaleString()
  }

  private getImpactColor(score: number): [number, number, number] {
    if (score >= 8) return [239, 68, 68] // Red - Critical
    if (score >= 6) return [251, 146, 60] // Orange - High
    if (score >= 4) return [251, 191, 36] // Yellow - Medium
    return [34, 197, 94] // Green - Low
  }
}
