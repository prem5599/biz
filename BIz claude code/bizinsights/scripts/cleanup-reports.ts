#!/usr/bin/env tsx

/**
 * Report Cleanup Script
 * 
 * This script can be run manually or via cron job to clean up expired reports.
 * 
 * Usage:
 * - Manual run: npx tsx scripts/cleanup-reports.ts
 * - Cron job: 0 2 * * * cd /path/to/project && npx tsx scripts/cleanup-reports.ts
 */

import { ReportCleanup } from '../src/lib/report-cleanup'

async function main() {
  console.log('=== BizInsights Report Cleanup ===')
  console.log(`Started at: ${new Date().toISOString()}`)
  
  try {
    // Get current statistics
    console.log('\n📊 Getting current report statistics...')
    const stats = await ReportCleanup.getReportStats()
    
    console.log(`Total reports: ${stats.totalReports}`)
    console.log(`Expired reports: ${stats.expiredReports}`)
    console.log(`Reports from last 7 days: ${stats.reportsBy7Days}`)
    console.log('Reports by format:')
    stats.reportsByFormat.forEach(item => {
      console.log(`  - ${item.format}: ${item.count}`)
    })

    // Run cleanup if there are expired reports
    if (stats.expiredReports > 0) {
      console.log('\n🧹 Running cleanup for expired reports...')
      const result = await ReportCleanup.deleteExpiredReports()
      console.log(`✅ Cleanup completed! Deleted ${result.deletedCount} expired reports.`)
    } else {
      console.log('\n✅ No expired reports found. No cleanup needed.')
    }

    // Get updated statistics
    console.log('\n📊 Final statistics...')
    const finalStats = await ReportCleanup.getReportStats()
    console.log(`Total reports: ${finalStats.totalReports}`)
    console.log(`Expired reports: ${finalStats.expiredReports}`)

    console.log(`\n🎉 Cleanup completed successfully at: ${new Date().toISOString()}`)
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Cleanup interrupted by user')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Cleanup terminated')
  process.exit(0)
})

// Run the cleanup
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})