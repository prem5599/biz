/**
 * Queue Instances
 * Creates and exports Bull Queue instances for different job types
 */

import Queue from 'bull';
import { queueConfig, QUEUE_NAMES } from './queue-config';

// Report generation queue
export const reportQueue = new Queue(QUEUE_NAMES.REPORTS, queueConfig);

// Integration sync queue
export const integrationSyncQueue = new Queue(QUEUE_NAMES.INTEGRATION_SYNC, queueConfig);

// Alert processing queue
export const alertQueue = new Queue(QUEUE_NAMES.ALERTS, queueConfig);

// Notification queue
export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, queueConfig);

// Queue event listeners for monitoring
const setupQueueListeners = (queue: Queue.Queue, name: string) => {
  queue.on('completed', (job) => {
    console.log(`[${name}] Job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`[${name}] Job ${job?.id} failed:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`[${name}] Job ${job.id} stalled`);
  });

  queue.on('error', (error) => {
    console.error(`[${name}] Queue error:`, error);
  });
};

// Set up listeners for all queues
setupQueueListeners(reportQueue, 'Reports');
setupQueueListeners(integrationSyncQueue, 'Integration Sync');
setupQueueListeners(alertQueue, 'Alerts');
setupQueueListeners(notificationQueue, 'Notifications');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing queues...');
  await Promise.all([
    reportQueue.close(),
    integrationSyncQueue.close(),
    alertQueue.close(),
    notificationQueue.close(),
  ]);
  console.log('Queues closed');
});

export const queues = {
  reports: reportQueue,
  integrationSync: integrationSyncQueue,
  alerts: alertQueue,
  notifications: notificationQueue,
};
