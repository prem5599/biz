import { prisma } from './prisma'

export class ReportCleanup {
  /**
   * Delete expired reports (older than 7 days)
   */
  static async deleteExpiredReports(): Promise<{ deletedCount: number }> {
    try {
      const now = new Date()
      
      console.log(`[ReportCleanup] Starting cleanup of expired reports at ${now.toISOString()}`)
      
      // Find expired reports
      const expiredReports = await prisma.report.findMany({
        where: {
          expiresAt: {
            lt: now
          }
        },
        select: {
          id: true,
          title: true,
          expiresAt: true,
          organizationId: true
        }
      })

      console.log(`[ReportCleanup] Found ${expiredReports.length} expired reports`)

      if (expiredReports.length === 0) {
        return { deletedCount: 0 }
      }

      // Delete expired reports
      const deleteResult = await prisma.report.deleteMany({
        where: {
          expiresAt: {
            lt: now
          }
        }
      })

      console.log(`[ReportCleanup] Successfully deleted ${deleteResult.count} expired reports`)
      
      // Log deleted reports for audit trail
      for (const report of expiredReports) {
        console.log(`[ReportCleanup] Deleted report: ${report.id} - "${report.title}" (expired: ${report.expiresAt?.toISOString()})`)
      }

      return { deletedCount: deleteResult.count }

    } catch (error) {
      console.error('[ReportCleanup] Error deleting expired reports:', error)
      throw error
    }
  }

  /**
   * Delete reports older than specified days
   */
  static async deleteReportsOlderThan(days: number): Promise<{ deletedCount: number }> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)
      
      console.log(`[ReportCleanup] Deleting reports older than ${days} days (before ${cutoffDate.toISOString()})`)
      
      const deleteResult = await prisma.report.deleteMany({
        where: {
          generatedAt: {
            lt: cutoffDate
          }
        }
      })

      console.log(`[ReportCleanup] Deleted ${deleteResult.count} reports older than ${days} days`)
      
      return { deletedCount: deleteResult.count }

    } catch (error) {
      console.error(`[ReportCleanup] Error deleting reports older than ${days} days:`, error)
      throw error
    }
  }

  /**
   * Get statistics about report storage
   */
  static async getReportStats(): Promise<{
    totalReports: number
    expiredReports: number
    reportsBy7Days: number
    reportsByFormat: { format: string; count: number }[]
  }> {
    try {
      const now = new Date()
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const [
        totalReports,
        expiredReports,
        reportsBy7Days,
        reportsByFormat
      ] = await Promise.all([
        // Total reports
        prisma.report.count(),
        
        // Expired reports
        prisma.report.count({
          where: {
            expiresAt: {
              lt: now
            }
          }
        }),
        
        // Reports from last 7 days
        prisma.report.count({
          where: {
            generatedAt: {
              gte: sevenDaysAgo
            }
          }
        }),
        
        // Reports by format
        prisma.report.groupBy({
          by: ['format'],
          _count: {
            format: true
          }
        })
      ])

      return {
        totalReports,
        expiredReports,
        reportsBy7Days,
        reportsByFormat: reportsByFormat.map(item => ({
          format: item.format || 'UNKNOWN',
          count: item._count.format
        }))
      }

    } catch (error) {
      console.error('[ReportCleanup] Error getting report stats:', error)
      throw error
    }
  }

  /**
   * Schedule automatic cleanup (to be called by cron job or similar)
   */
  static async scheduleCleanup(): Promise<void> {
    try {
      console.log('[ReportCleanup] Running scheduled cleanup...')
      
      const stats = await this.getReportStats()
      console.log('[ReportCleanup] Current stats:', stats)
      
      if (stats.expiredReports > 0) {
        const result = await this.deleteExpiredReports()
        console.log(`[ReportCleanup] Cleanup completed. Deleted ${result.deletedCount} expired reports.`)
      } else {
        console.log('[ReportCleanup] No expired reports found. Cleanup not needed.')
      }

    } catch (error) {
      console.error('[ReportCleanup] Scheduled cleanup failed:', error)
      throw error
    }
  }
}