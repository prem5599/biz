import { prisma } from './prisma'
import { ReportService, ReportRequest } from './report-service'
import { ExportService } from './export-service'

export interface ScheduledReportConfig {
  id?: string
  organizationId: string
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'customer' | 'revenue' | 'executive' | 'performance'
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  format: 'json' | 'pdf' | 'excel' | 'csv'
  recipients: string[]
  isActive: boolean
  nextRunDate: Date
  title?: string
  currency: string
  includeInsights?: boolean
  includeForecast?: boolean
}

export class ReportScheduler {
  static async createScheduledReport(config: ScheduledReportConfig) {
    const nextRunDate = this.calculateNextRunDate(config.frequency)
    
    const scheduledReport = await prisma.scheduledReport.create({
      data: {
        organizationId: config.organizationId,
        reportType: config.reportType.toUpperCase(),
        frequency: config.frequency.toUpperCase(),
        format: config.format.toUpperCase(),
        recipients: config.recipients,
        isActive: config.isActive,
        nextRunDate,
        title: config.title || `${config.reportType} Report`,
        currency: config.currency,
        includeInsights: config.includeInsights || false,
        includeForecast: config.includeForecast || false
      }
    })

    return scheduledReport
  }

  static async updateScheduledReport(id: string, updates: Partial<ScheduledReportConfig>) {
    const updateData: any = { ...updates }
    
    if (updates.frequency) {
      updateData.nextRunDate = this.calculateNextRunDate(updates.frequency)
      updateData.frequency = updates.frequency.toUpperCase()
    }
    
    if (updates.reportType) {
      updateData.reportType = updates.reportType.toUpperCase()
    }
    
    if (updates.format) {
      updateData.format = updates.format.toUpperCase()
    }

    const scheduledReport = await prisma.scheduledReport.update({
      where: { id },
      data: updateData
    })

    return scheduledReport
  }

  static async deleteScheduledReport(id: string) {
    await prisma.scheduledReport.delete({
      where: { id }
    })
  }

  static async getScheduledReports(organizationId: string) {
    const scheduledReports = await prisma.scheduledReport.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    })

    return scheduledReports
  }

  static async getDueReports() {
    const now = new Date()
    
    const dueReports = await prisma.scheduledReport.findMany({
      where: {
        isActive: true,
        nextRunDate: {
          lte: now
        }
      },
      include: {
        organization: true
      }
    })

    return dueReports
  }

  static async executeScheduledReport(scheduledReport: any) {
    try {
      const reportService = new ReportService(scheduledReport.organizationId)
      
      const reportRequest: ReportRequest = {
        organizationId: scheduledReport.organizationId,
        reportType: scheduledReport.reportType.toLowerCase(),
        period: this.getPeriodFromFrequency(scheduledReport.frequency),
        currency: scheduledReport.currency,
        includeInsights: scheduledReport.includeInsights,
        includeForecast: scheduledReport.includeForecast,
        format: scheduledReport.format.toLowerCase() === 'json' ? 'json' : 'pdf'
      }

      // Generate the report
      const reportContent = await reportService.generateReport(reportRequest)

      // Export if needed
      let exportBuffer: Buffer | null = null
      if (scheduledReport.format.toLowerCase() !== 'json') {
        exportBuffer = await ExportService.exportReport(reportContent, {
          format: scheduledReport.format.toLowerCase() as 'csv' | 'excel' | 'pdf',
          watermark: 'BizInsights'
        })
      }

      // Update next run date
      const nextRunDate = this.calculateNextRunDate(scheduledReport.frequency.toLowerCase())
      await prisma.scheduledReport.update({
        where: { id: scheduledReport.id },
        data: { 
          nextRunDate,
          lastRunDate: new Date()
        }
      })

      // Log execution
      await prisma.reportExecution.create({
        data: {
          scheduledReportId: scheduledReport.id,
          reportId: reportContent.id,
          status: 'SUCCESS',
          executedAt: new Date()
        }
      })

      return {
        success: true,
        reportContent,
        exportBuffer,
        fileName: `${reportContent.title.replace(/\s+/g, '_')}.${this.getFileExtension(scheduledReport.format)}`
      }

    } catch (error) {
      console.error('Error executing scheduled report:', error)
      
      // Log failed execution
      await prisma.reportExecution.create({
        data: {
          scheduledReportId: scheduledReport.id,
          status: 'FAILED',
          executedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      })

      throw error
    }
  }

  static async runDueReports() {
    const dueReports = await this.getDueReports()
    const results = []

    for (const scheduledReport of dueReports) {
      try {
        const result = await this.executeScheduledReport(scheduledReport)
        results.push({
          scheduledReportId: scheduledReport.id,
          success: true,
          ...result
        })
      } catch (error) {
        results.push({
          scheduledReportId: scheduledReport.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }

  private static calculateNextRunDate(frequency: string): Date {
    const now = new Date()
    const nextRun = new Date(now)

    switch (frequency.toLowerCase()) {
      case 'daily':
        nextRun.setDate(now.getDate() + 1)
        break
      case 'weekly':
        nextRun.setDate(now.getDate() + 7)
        break
      case 'monthly':
        nextRun.setMonth(now.getMonth() + 1)
        break
      case 'quarterly':
        nextRun.setMonth(now.getMonth() + 3)
        break
      default:
        nextRun.setDate(now.getDate() + 7) // Default to weekly
    }

    // Set to 9 AM for consistent scheduling
    nextRun.setHours(9, 0, 0, 0)

    return nextRun
  }

  private static getPeriodFromFrequency(frequency: string): string {
    switch (frequency.toLowerCase()) {
      case 'daily':
        return 'weekly' // Show last week for daily reports
      case 'weekly':
        return 'weekly'
      case 'monthly':
        return 'monthly'
      case 'quarterly':
        return 'quarterly'
      default:
        return 'monthly'
    }
  }

  private static getFileExtension(format: string): string {
    switch (format.toLowerCase()) {
      case 'pdf':
        return 'pdf'
      case 'excel':
        return 'xlsx'
      case 'csv':
        return 'csv'
      default:
        return 'json'
    }
  }
}