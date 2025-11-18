/**
 * Individual Queue Management API
 *
 * Provides endpoints for managing individual queues.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queueService, QueueName } from '@/lib/queue/queue-service';

interface RouteParams {
  params: {
    queueName: string;
  };
}

/**
 * GET /api/jobs/[queueName]
 * Get statistics for a specific queue
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { queueName } = params;

    // Validate queue name
    if (!Object.values(QueueName).includes(queueName as QueueName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid queue name' },
        { status: 400 }
      );
    }

    const stats = await queueService.getQueueStats(queueName as QueueName);

    // Get failed jobs
    const failedJobs = await queueService.getFailedJobs(queueName as QueueName, 0, 10);

    return NextResponse.json({
      success: true,
      data: {
        queueName,
        stats,
        failedJobs: failedJobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
        })),
      },
    });
  } catch (error: any) {
    console.error('Error fetching queue data:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'QUEUE_ERROR',
          message: 'Failed to fetch queue data',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/jobs/[queueName]/pause
 * Pause a queue
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { queueName } = params;

    // Validate queue name
    if (!Object.values(QueueName).includes(queueName as QueueName)) {
      return NextResponse.json(
        { success: false, error: 'Invalid queue name' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'pause') {
      await queueService.pauseQueue(queueName as QueueName);
      return NextResponse.json({
        success: true,
        data: { message: `Queue ${queueName} paused` },
      });
    } else if (action === 'resume') {
      await queueService.resumeQueue(queueName as QueueName);
      return NextResponse.json({
        success: true,
        data: { message: `Queue ${queueName} resumed` },
      });
    } else if (action === 'empty') {
      await queueService.emptyQueue(queueName as QueueName);
      return NextResponse.json({
        success: true,
        data: { message: `Queue ${queueName} emptied` },
      });
    } else if (action === 'clean') {
      await queueService.cleanQueue(queueName as QueueName);
      return NextResponse.json({
        success: true,
        data: { message: `Queue ${queueName} cleaned` },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Error managing queue:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'QUEUE_MANAGEMENT_ERROR',
          message: 'Failed to manage queue',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}
