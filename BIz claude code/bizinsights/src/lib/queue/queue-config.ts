/**
 * Queue Configuration
 * Centralizes Bull Queue configuration for all background jobs
 */

import { QueueOptions } from 'bull';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL
const redisUrl = new URL(REDIS_URL);

export const queueConfig: QueueOptions = {
  redis: {
    host: redisUrl.hostname,
    port: parseInt(redisUrl.port || '6379'),
    password: redisUrl.password || undefined,
    // Retry strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    // Connection settings
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
  },
  // Default job options
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs for debugging
  },
};

// Queue names
export const QUEUE_NAMES = {
  REPORTS: 'reports',
  INTEGRATION_SYNC: 'integration-sync',
  ALERTS: 'alerts',
  NOTIFICATIONS: 'notifications',
} as const;

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES];
