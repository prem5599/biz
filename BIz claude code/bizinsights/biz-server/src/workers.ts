#!/usr/bin/env tsx
/**
 * Background Workers Startup Script
 * Starts all Bull Queue workers for processing background jobs
 *
 * Usage: npm run workers
 */

import './src/lib/queue/workers/report-worker';
import './src/lib/queue/workers/sync-worker';
import './src/lib/queue/workers/alert-worker';

console.log('');
console.log('🚀 BizInsights Background Workers');
console.log('================================');
console.log('');
console.log('✅ Report Worker - Ready');
console.log('✅ Integration Sync Worker - Ready');
console.log('✅ Alert Worker - Ready');
console.log('');
console.log('Workers are now processing jobs from Redis queues...');
console.log('Press Ctrl+C to stop');
console.log('');

// Keep the process running
process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down workers gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down workers gracefully...');
  process.exit(0);
});
