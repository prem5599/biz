#!/usr/bin/env tsx
/**
 * Test Redis and Bull Queue Connection
 * Quick test to verify Redis is working and queues can connect
 */

import Queue from 'bull';

async function testRedis() {
  console.log('');
  console.log('🧪 Testing Redis & Bull Queue');
  console.log('==============================');
  console.log('');

  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`📍 Redis URL: ${REDIS_URL}`);
  console.log('');

  try {
    // Create a test queue
    console.log('1️⃣  Creating test queue...');
    const testQueue = new Queue('test-queue', REDIS_URL);

    console.log('2️⃣  Checking if queue is ready...');
    const isReady = await testQueue.isReady();

    if (!isReady) {
      throw new Error('Queue not ready');
    }

    console.log('   ✅ Queue is ready!\n');

    // Add a test job
    console.log('3️⃣  Adding test job to queue...');
    const job = await testQueue.add('test-job', {
      message: 'Hello from Bull Queue!',
      timestamp: new Date().toISOString(),
    });

    console.log(`   ✅ Job added: ${job.id}\n`);

    // Check job status
    console.log('4️⃣  Checking job status...');
    const state = await job.getState();
    console.log(`   Job State: ${state}`);
    console.log(`   Job ID: ${job.id}`);
    console.log(`   ✅ Job is in queue\n`);

    // Get queue stats
    console.log('5️⃣  Getting queue statistics...');
    const waiting = await testQueue.getWaitingCount();
    const active = await testQueue.getActiveCount();
    const completed = await testQueue.getCompletedCount();
    const failed = await testQueue.getFailedCount();

    console.log(`   Waiting: ${waiting}`);
    console.log(`   Active: ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);
    console.log('   ✅ Stats retrieved\n');

    // Clean up
    console.log('6️⃣  Cleaning up test job...');
    await job.remove();
    await testQueue.close();
    console.log('   ✅ Cleanup complete\n');

    console.log('🎉 All tests passed!');
    console.log('');
    console.log('✅ Redis is working correctly');
    console.log('✅ Bull Queue can connect to Redis');
    console.log('✅ Jobs can be added to queues');
    console.log('');
    console.log('📋 Your background job system is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('  • Run workers: npm run workers');
    console.log('  • Jobs will be processed automatically');
    console.log('  • Check the workers console for job logs');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Test failed:', error);
    console.error('');

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 Redis is not running!');
        console.error('');
        console.error('Start Redis with:');
        console.error('  redis-server --daemonize yes --port 6379');
        console.error('');
        console.error('Or check if Redis is running:');
        console.error('  redis-cli ping');
        console.error('');
      } else {
        console.error('Error details:', error.message);
      }
    }

    process.exit(1);
  }
}

testRedis();
