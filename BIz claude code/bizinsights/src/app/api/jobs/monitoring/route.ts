/**
 * Job Monitoring API
 *
 * Provides endpoints for monitoring job queue status and statistics.
 * Useful for admin dashboards and debugging.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queueService, QueueName } from '@/lib/queue/queue-service';

/**
 * GET /api/jobs/monitoring
 * Get comprehensive queue statistics and job counts
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all queue statistics
    const [queueStats, jobCounts] = await Promise.all([
      queueService.getAllQueueStats(),
      queueService.getJobCounts(),
    ]);

    // Calculate totals
    const totals = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };

    for (const stats of Object.values(queueStats)) {
      totals.waiting += stats.waiting;
      totals.active += stats.active;
      totals.completed += stats.completed;
      totals.failed += stats.failed;
      totals.delayed += stats.delayed;
      totals.paused += stats.paused;
    }

    return NextResponse.json({
      success: true,
      data: {
        queues: queueStats,
        jobCounts,
        totals,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching queue monitoring data:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MONITORING_ERROR',
          message: 'Failed to fetch queue monitoring data',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/monitoring/retry
 * Retry failed jobs
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { queueName, jobId } = body;

    if (!queueName) {
      return NextResponse.json(
        { success: false, error: 'Queue name is required' },
        { status: 400 }
      );
    }

    // Validate queue name
    if (!Object.values(QueueName).includes(queueName as QueueName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid queue name' },
        { status: 400 }
      );
    }

    if (jobId) {
      // Retry specific job
      await queueService.retryFailedJob(queueName as QueueName, jobId);
      return NextResponse.json({
        success: true,
        data: {
          message: `Job ${jobId} queued for retry`,
        },
      });
    } else {
      // Retry all failed jobs in the queue
      await queueService.retryAllFailedJobs(queueName as QueueName);
      return NextResponse.json({
        success: true,
        data: {
          message: `All failed jobs in ${queueName} queued for retry`,
        },
      });
    }
  } catch (error: any) {
    console.error('Error retrying jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RETRY_ERROR',
          message: 'Failed to retry jobs',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
