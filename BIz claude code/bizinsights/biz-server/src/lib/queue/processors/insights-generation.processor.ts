/**
 * Insights Generation Job Processor
 *
 * Handles background generation of AI insights from synced data.
 * Analyzes trends, detects anomalies, and creates actionable recommendations.
 */

import { Job } from 'bull';
import { InsightsGenerationJob } from '../queue-service';
import { prisma } from '@/lib/prisma';
import { InsightsEngine } from '@/lib/insights/InsightsEngine';

export async function processInsightsGeneration(job: Job<InsightsGenerationJob>): Promise<any> {
  const { organizationId, period, forceRegenerate } = job.data;

  console.log(`Starting insights generation for organization ${organizationId}`);

  try {
    await job.progress(10);

    // Check if organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        integrations: {
          where: { status: 'CONNECTED' },
        },
      },
    });

    if (!organization) {
      throw new Error(`Organization ${organizationId} not found`);
    }

    if (organization.integrations.length === 0) {
      console.log('No connected integrations, skipping insights generation');
      return { success: true, insightsGenerated: 0, message: 'No connected integrations' };
    }

    await job.progress(20);

    // Check if insights were recently generated (unless force regenerate)
    if (!forceRegenerate) {
      const recentInsights = await prisma.insight.findFirst({
        where: {
          organizationId,
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
          },
        },
      });

      if (recentInsights) {
        console.log('Insights recently generated, skipping');
        return {
          success: true,
          insightsGenerated: 0,
          message: 'Insights recently generated',
        };
      }
    }

    await job.progress(30);

    // Get data points for the period
    const endDate = new Date();
    const startDate = getStartDateForPeriod(period, endDate);

    const dataPoints = await prisma.dataPoint.findMany({
      where: {
        integration: {
          organizationId,
        },
        dateRecorded: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        integration: true,
      },
      orderBy: {
        dateRecorded: 'asc',
      },
    });

    if (dataPoints.length === 0) {
      console.log('No data points available for insights generation');
      return { success: true, insightsGenerated: 0, message: 'No data available' };
    }

    await job.progress(50);

    // Generate insights using InsightsEngine
    const insightsEngine = new InsightsEngine(prisma);
    const insights = await insightsEngine.generateInsights(organizationId, period);

    await job.progress(80);

    // Save insights to database
    const savedInsights = await Promise.all(
      insights.map((insight) =>
        prisma.insight.create({
          data: {
            organizationId,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            impactScore: insight.impactScore,
            isRead: false,
            metadata: insight.metadata || {},
          },
        })
      )
    );

    await job.progress(90);

    // Generate alerts for high-impact insights
    const highImpactInsights = savedInsights.filter((insight) => insight.impactScore >= 8);

    if (highImpactInsights.length > 0) {
      await generateAlertsForInsights(organizationId, highImpactInsights);
    }

    await job.progress(100);

    console.log(`Generated ${savedInsights.length} insights for organization ${organizationId}`);

    return {
      success: true,
      insightsGenerated: savedInsights.length,
      highImpactCount: highImpactInsights.length,
      period,
      duration: Date.now() - job.timestamp,
    };
  } catch (error: any) {
    console.error(`Insights generation failed for organization ${organizationId}:`, error);
    throw error;
  }
}

/**
 * Generate alerts for high-impact insights
 */
async function generateAlertsForInsights(
  organizationId: string,
  insights: any[]
): Promise<void> {
  try {
    const alerts = insights.map((insight) => ({
      organizationId,
      type: 'INSIGHT',
      severity: getSeverityFromImpactScore(insight.impactScore),
      title: `High-Impact Insight: ${insight.title}`,
      message: insight.description,
      isRead: false,
      metadata: {
        insightId: insight.id,
        insightType: insight.type,
        impactScore: insight.impactScore,
      },
    }));

    await prisma.alert.createMany({
      data: alerts,
    });

    console.log(`Created ${alerts.length} alerts for high-impact insights`);
  } catch (error) {
    console.error('Failed to generate alerts:', error);
  }
}

/**
 * Convert impact score to alert severity
 */
function getSeverityFromImpactScore(impactScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (impactScore >= 9) return 'CRITICAL';
  if (impactScore >= 8) return 'HIGH';
  if (impactScore >= 6) return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate start date based on period
 */
function getStartDateForPeriod(period: string, endDate: Date): Date {
  const startDate = new Date(endDate);

  switch (period) {
    case '7d':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case 'ytd':
      startDate.setMonth(0, 1); // January 1st of current year
      break;
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30); // Default to 30 days
  }

  return startDate;
}

/**
 * Schedule recurring insights generation for an organization
 */
export async function scheduleRecurringInsightsGeneration(
  organizationId: string,
  cronExpression: string = '0 */6 * * *' // Every 6 hours by default
): Promise<void> {
  const { queueService, QueueName } = await import('../queue-service');

  await queueService.addRecurringJob(
    QueueName.INSIGHTS_GENERATION,
    `insights-${organizationId}`,
    {
      organizationId,
      period: '30d',
      forceRegenerate: false,
    },
    cronExpression
  );

  console.log(`Scheduled recurring insights generation for organization ${organizationId}`);
}
