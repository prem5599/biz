import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ReportCleanup } from '@/lib/report-cleanup'

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Manual cleanup trigger (admin only - you might want to add role check)
    const result = await ReportCleanup.deleteExpiredReports()

    return NextResponse.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        message: `Successfully deleted ${result.deletedCount} expired reports`
      }
    })

  } catch (error) {
    console.error('Error running report cleanup:', error)
    return NextResponse.json(
      { error: 'Failed to run report cleanup' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get report statistics
    const stats = await ReportCleanup.getReportStats()

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Error getting report stats:', error)
    return NextResponse.json(
      { error: 'Failed to get report statistics' },
      { status: 500 }
    )
  }
}