/**
 * Queue Service
 *
 * Central service for managing all background job queues using Bull.
 * Provides queue creation, job scheduling, and monitoring capabilities.
 */

import Queue, { Job, JobOptions, QueueOptions } from 'bull';

// Queue names enum for type safety
export enum QueueName {
  DATA_SYNC = 'data-sync',
  INSIGHTS_GENERATION = 'insights-generation',
  WEBHOOK_PROCESSING = 'webhook-processing',
  REPORT_GENERATION = 'report-generation',
  EMAIL_SENDING = 'email-sending',
  ALERTS = 'alerts',
}

// Job types for each queue
export interface DataSyncJob {
  integrationId: string;
  organizationId: string;
  platform: string;
  syncType: 'full' | 'incremental';
  startDate?: string;
  endDate?: string;
}

export interface InsightsGenerationJob {
  organizationId: string;
  period: string;
  forceRegenerate?: boolean;
}

export interface WebhookProcessingJob {
  platform: string;
  eventType: string;
  payload: any;
  signature: string;
  organizationId?: string;
  integrationId?: string;
}

export interface ReportGenerationJob {
  reportId: string;
  organizationId: string;
  reportType: string;
  period: string;
  recipientEmails?: string[];
}

export interface EmailSendingJob {
  to: string | string[];
  subject: string;
  template: string;
  data: any;
  organizationId?: string;
}

export interface AlertJob {
  organizationId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata: any;
}

// Union type for all job data
export type JobData =
  | DataSyncJob
  | InsightsGenerationJob
  | WebhookProcessingJob
  | ReportGenerationJob
  | EmailSendingJob
  | AlertJob;

/**
 * Queue Service Class
 * Manages all background job queues
 */
export class QueueService {
  private static instance: QueueService;
  private queues: Map<QueueName, Queue.Queue> = new Map();
  private redisUrl: string;

  private constructor() {
    this.redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.initializeQueues();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Initialize all queues
   */
  private initializeQueues(): void {
    const queueOptions: QueueOptions = {
      redis: this.redisUrl,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    };

    // Create all queues
    Object.values(QueueName).forEach((queueName) => {
      const queue = new Queue(queueName, queueOptions);

      // Set up event listeners
      queue.on('error', (error) => {
        console.error(`Queue ${queueName} error:`, error);
      });

      queue.on('waiting', (jobId) => {
        console.log(`Job ${jobId} waiting in queue ${queueName}`);
      });

      queue.on('active', (job) => {
        console.log(`Job ${job.id} started in queue ${queueName}`);
      });

      queue.on('completed', (job, result) => {
        console.log(`Job ${job.id} completed in queue ${queueName}`);
      });

      queue.on('failed', (job, err) => {
        console.error(`Job ${job.id} failed in queue ${queueName}:`, err);
      });

      queue.on('stalled', (job) => {
        console.warn(`Job ${job.id} stalled in queue ${queueName}`);
      });

      this.queues.set(queueName as QueueName, queue);
    });

    console.log('All queues initialized');
  }

  /**
   * Get a specific queue
   */
  public getQueue(queueName: QueueName): Queue.Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }
    return queue;
  }

  /**
   * Add job to queue
   */
  public async addJob<T extends JobData>(
    queueName: QueueName,
    data: T,
    options?: JobOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(data, options);
  }

  /**
   * Add recurring job (cron-style)
   */
  public async addRecurringJob<T extends JobData>(
    queueName: QueueName,
    jobName: string,
    data: T,
    cronExpression: string
  ): Promise<Queue.Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(data, {
      repeat: {
        cron: cronExpression,
      },
      jobId: jobName, // Use jobId to prevent duplicates
    });
  }

  /**
   * Schedule job for specific time
   */
  public async scheduleJob<T extends JobData>(
    queueName: QueueName,
    data: T,
    delayMs: number
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    return queue.add(data, {
      delay: delayMs,
    });
  }

  /**
   * Get job by ID
   */
  public async getJob(queueName: QueueName, jobId: string): Promise<Job | null> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  /**
   * Remove job by ID
   */
  public async removeJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(queueName: QueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  }> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.getPausedCount(),
    ]);

    return { waiting, active, completed, failed, delayed, paused };
  }

  /**
   * Get all queue statistics
   */
  public async getAllQueueStats(): Promise<
    Record<
      QueueName,
      {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        paused: number;
      }
    >
  > {
    const stats: any = {};

    for (const queueName of Object.values(QueueName)) {
      stats[queueName] = await this.getQueueStats(queueName as QueueName);
    }

    return stats;
  }

  /**
   * Pause queue
   */
  public async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    console.log(`Queue ${queueName} paused`);
  }

  /**
   * Resume queue
   */
  public async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    console.log(`Queue ${queueName} resumed`);
  }

  /**
   * Empty queue (remove all jobs)
   */
  public async emptyQueue(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.empty();
    console.log(`Queue ${queueName} emptied`);
  }

  /**
   * Clean completed jobs
   */
  public async cleanQueue(
    queueName: QueueName,
    grace: number = 24 * 3600 * 1000,
    status: 'completed' | 'failed' = 'completed'
  ): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return queue.clean(grace, status);
  }

  /**
   * Get failed jobs
   */
  public async getFailedJobs(queueName: QueueName, start = 0, end = -1): Promise<Job[]> {
    const queue = this.getQueue(queueName);
    return queue.getFailed(start, end);
  }

  /**
   * Retry failed job
   */
  public async retryFailedJob(queueName: QueueName, jobId: string): Promise<void> {
    const queue = this.getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.retry();
    }
  }

  /**
   * Retry all failed jobs
   */
  public async retryAllFailedJobs(queueName: QueueName): Promise<void> {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed();

    for (const job of failedJobs) {
      await job.retry();
    }

    console.log(`Retried ${failedJobs.length} failed jobs in queue ${queueName}`);
  }

  /**
   * Close all queues
   */
  public async closeAll(): Promise<void> {
    const closePromises = Array.from(this.queues.values()).map((queue) => queue.close());
    await Promise.all(closePromises);
    console.log('All queues closed');
  }

  /**
   * Get job counts for monitoring dashboard
   */
  public async getJobCounts(): Promise<
    Record<
      QueueName,
      {
        total: number;
        byStatus: Record<string, number>;
      }
    >
  > {
    const counts: any = {};

    for (const queueName of Object.values(QueueName)) {
      const queue = this.getQueue(queueName as QueueName);
      const jobCounts = await queue.getJobCounts();

      counts[queueName] = {
        total: Object.values(jobCounts).reduce((sum: number, count: number) => sum + count, 0),
        byStatus: jobCounts,
      };
    }

    return counts;
  }
}

// Export singleton instance
export const queueService = QueueService.getInstance();
