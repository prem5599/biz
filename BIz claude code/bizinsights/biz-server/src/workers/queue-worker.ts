#!/usr/bin/env node
/**
 * Queue Worker
 *
 * Background worker process that processes jobs from all queues.
 * Run this as a separate process: node workers/queue-worker.js
 * or using process manager like PM2: pm2 start workers/queue-worker.js
 */

import { queueService, QueueName } from '@/lib/queue/queue-service';
import {
  processDataSync,
  processInsightsGeneration,
  processWebhook,
  processReportGeneration,
  processEmailSending,
  processAlert,
} from '@/lib/queue/processors';

// Handle graceful shutdown
let isShuttingDown = false;

async function startWorker() {
  console.log('🚀 Starting Queue Worker...');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔧 Node Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Redis URL: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);

  try {
    // Register processors for each queue
    console.log('\n📋 Registering queue processors...');

    // Data Sync Queue
    const dataSyncQueue = queueService.getQueue(QueueName.DATA_SYNC);
    dataSyncQueue.process(5, async (job) => {
      // Process up to 5 concurrent data sync jobs
      return await processDataSync(job);
    });
    console.log('✅ Data Sync processor registered (concurrency: 5)');

    // Insights Generation Queue
    const insightsQueue = queueService.getQueue(QueueName.INSIGHTS_GENERATION);
    insightsQueue.process(2, async (job) => {
      // Process up to 2 concurrent insights jobs (more resource-intensive)
      return await processInsightsGeneration(job);
    });
    console.log('✅ Insights Generation processor registered (concurrency: 2)');

    // Webhook Processing Queue
    const webhookQueue = queueService.getQueue(QueueName.WEBHOOK_PROCESSING);
    webhookQueue.process(10, async (job) => {
      // Process up to 10 concurrent webhook jobs (fast processing)
      return await processWebhook(job);
    });
    console.log('✅ Webhook Processing processor registered (concurrency: 10)');

    // Report Generation Queue
    const reportQueue = queueService.getQueue(QueueName.REPORT_GENERATION);
    reportQueue.process(3, async (job) => {
      // Process up to 3 concurrent report jobs
      return await processReportGeneration(job);
    });
    console.log('✅ Report Generation processor registered (concurrency: 3)');

    // Email Sending Queue
    const emailQueue = queueService.getQueue(QueueName.EMAIL_SENDING);
    emailQueue.process(5, async (job) => {
      // Process up to 5 concurrent email jobs
      return await processEmailSending(job);
    });
    console.log('✅ Email Sending processor registered (concurrency: 5)');

    // Alerts Queue
    const alertsQueue = queueService.getQueue(QueueName.ALERTS);
    alertsQueue.process(5, async (job) => {
      // Process up to 5 concurrent alert jobs
      return await processAlert(job);
    });
    console.log('✅ Alerts processor registered (concurrency: 5)');

    console.log('\n✨ Queue Worker is now running and processing jobs...');
    console.log('Press Ctrl+C to gracefully shutdown\n');

    // Display queue statistics every 30 seconds
    setInterval(async () => {
      if (!isShuttingDown) {
        await displayQueueStats();
      }
    }, 30000);

    // Initial stats display
    setTimeout(() => displayQueueStats(), 5000);
  } catch (error) {
    console.error('❌ Failed to start queue worker:', error);
    process.exit(1);
  }
}

/**
 * Display queue statistics
 */
async function displayQueueStats() {
  try {
    const stats = await queueService.getAllQueueStats();

    console.log('\n📊 Queue Statistics:');
    console.log('─'.repeat(80));

    for (const [queueName, queueStats] of Object.entries(stats)) {
      const total =
        queueStats.waiting +
        queueStats.active +
        queueStats.delayed;

      if (total > 0 || queueStats.active > 0) {
        console.log(
          `${queueName.padEnd(25)} | ` +
            `Active: ${queueStats.active.toString().padStart(3)} | ` +
            `Waiting: ${queueStats.waiting.toString().padStart(3)} | ` +
            `Delayed: ${queueStats.delayed.toString().padStart(3)}`
        );
      }
    }

    console.log('─'.repeat(80) + '\n');
  } catch (error) {
    console.error('Error fetching queue stats:', error);
  }
}

/**
 * Graceful shutdown handler
 */
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    console.log('\n⚠️  Forced shutdown...');
    process.exit(1);
  }

  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  isShuttingDown = true;

  try {
    console.log('⏳ Waiting for active jobs to complete...');

    // Wait a bit for active jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log('🔌 Closing all queue connections...');
    await queueService.closeAll();

    console.log('✅ Queue worker shut down successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the worker
startWorker().catch((error) => {
  console.error('💥 Fatal error starting worker:', error);
  process.exit(1);
});
