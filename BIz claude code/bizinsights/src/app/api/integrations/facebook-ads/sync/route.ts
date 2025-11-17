/**
 * Facebook Ads Sync API
 *
 * Triggers manual sync of Facebook Ads data
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncFacebookAdsData } from '@/lib/integrations/facebook-ads';
import { queueService, QueueName } from '@/lib/queue/queue-service';
import { z } from 'zod';

const syncSchema = z.object({
  organizationId: z.string(),
  async: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, async } = syncSchema.parse(body);

    // Find Facebook Ads integration
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId,
        platform: 'FACEBOOK_ADS',
        status: 'CONNECTED',
      },
    });

    if (!integration) {
      return NextResponse.json(
        { success: false, error: 'Facebook Ads integration not found' },
        { status: 404 }
      );
    }

    if (async) {
      // Queue for background processing
      await queueService.addJob(QueueName.DATA_SYNC, {
        integrationId: integration.id,
        organizationId,
        platform: 'facebook-ads',
        syncType: 'full',
      });

      return NextResponse.json({
        success: true,
        message: 'Facebook Ads sync queued successfully',
        data: {
          async: true,
          integrationId: integration.id,
        },
      });
    } else {
      // Sync immediately
      const result = await syncFacebookAdsData(integration);

      // Update last sync time
      await prisma.integration.update({
        where: { id: integration.id },
        data: { lastSyncAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: 'Facebook Ads data synced successfully',
        data: {
          campaignsSynced: result.campaignsSynced,
          syncedAt: new Date().toISOString(),
          integrationId: integration.id,
        },
      });
    }
  } catch (error: any) {
    console.error('Facebook Ads sync error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: 'Failed to sync Facebook Ads data',
          details: error.message,
        },
      },
      { status: 500 }
    );
  }
}