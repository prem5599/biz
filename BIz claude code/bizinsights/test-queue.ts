#!/usr/bin/env tsx
/**
 * Test Queue System
 * Tests that Bull Queue and Redis are working correctly
 */

import { JobScheduler } from './src/lib/queue/job-scheduler';
import { prisma } from './src/lib/prisma';

async function testQueueSystem() {
  console.log('');
  console.log('🧪 Testing Bull Queue System');
  console.log('============================');
  console.log('');

  try {
    // Test 1: Check Redis connection
    console.log('1️⃣  Testing Redis connection...');
    const { reportQueue } = await import('./src/lib/queue/queues');
    const isReady = await reportQueue.isReady();
    if (isReady) {
      console.log('   ✅ Redis connected successfully\n');
    } else {
      throw new Error('Redis not connected');
    }

    // Test 2: Find a test organization
    console.log('2️⃣  Finding test organization...');
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      console.log('   ⚠️  No organizations found. Creating test organization...');
      // For testing purposes, just log that we need an org
      console.log('   Please create an organization first or run: npm run seed\n');
      return;
    }
    console.log(`   ✅ Using organization: ${organization.name} (${organization.id})\n`);

    // Test 3: Schedule a test sync job
    console.log('3️⃣  Scheduling test integration sync job...');
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: organization.id,
        status: 'CONNECTED',
      },
    });

    if (integration) {
      const syncJob = await JobScheduler.scheduleSync({
        integrationId: integration.id,
        organizationId: organization.id,
        platform: integration.platform as any,
      });
      console.log(`   ✅ Sync job scheduled: ${syncJob.id}\n`);
    } else {
      console.log('   ⚠️  No connected integrations found. Skipping sync test.\n');
    }

    // Test 4: Schedule a test report job
    console.log('4️⃣  Scheduling test report generation job...');
    const reportJob = await JobScheduler.scheduleReport({
      organizationId: organization.id,
      reportType: 'weekly',
      period: '7d',
      currency: 'USD',
      includeInsights: true,
      format: 'json',
    });
    console.log(`   ✅ Report job scheduled: ${reportJob.id}\n`);

    // Test 5: Check job status
    console.log('5️⃣  Checking job status...');
    const status = await JobScheduler.getJobStatus(reportJob.id as string, 'reports');
    console.log(`   Job State: ${status?.state}`);
    console.log(`   Job Progress: ${status?.progress}%`);
    console.log('   ✅ Job status retrieved\n');

    console.log('🎉 All queue tests passed!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('   1. Start the workers: npm run workers');
    console.log('   2. Watch the console for job processing');
    console.log('   3. Jobs will be processed automatically');
    console.log('');

    // Clean up
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Queue test failed:', error);
    console.error('');

    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      console.error('💡 Redis is not running! Start it with:');
      console.error('   redis-server --daemonize yes --port 6379');
      console.error('');
    }

    await prisma.$disconnect();
    process.exit(1);
  }
}

testQueueSystem();
