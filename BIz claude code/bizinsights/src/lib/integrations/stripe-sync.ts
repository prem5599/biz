/**
 * Stripe Data Sync Module
 * Complete implementation for syncing payments, subscriptions, and customer data
 */

import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function syncStripeData(
  organizationId: string,
  integrationId: string,
  apiKey: string
) {
  console.log('[Stripe Sync] Starting sync...');

  try {
    // Initialize Stripe client
    const stripe = new Stripe(apiKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Clear existing DataPoints for fresh sync
    await prisma.dataPoint.deleteMany({
      where: { integrationId, organizationId },
    });

    const dataPoints = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Sync Charges/Payments
    console.log('[Stripe Sync] Fetching charges...');
    const charges = await stripe.charges.list({
      limit: 100,
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
    });

    let totalRevenue = 0;
    let successfulCharges = 0;
    let failedCharges = 0;
    const currencyTotals = new Map<string, number>();

    for (const charge of charges.data) {
      if (charge.status === 'succeeded') {
        const amount = charge.amount / 100; // Convert from cents
        const currency = charge.currency.toUpperCase();

        totalRevenue += amount;
        successfulCharges++;

        currencyTotals.set(
          currency,
          (currencyTotals.get(currency) || 0) + amount
        );

        dataPoints.push({
          integrationId,
          organizationId,
          metricType: 'payment',
          value: amount,
          metadata: {
            chargeId: charge.id,
            currency,
            paymentMethod: charge.payment_method_details?.type,
            customerId: charge.customer,
            description: charge.description,
            status: charge.status,
            receiptUrl: charge.receipt_url,
          },
          dateRecorded: new Date(charge.created * 1000),
        });
      } else {
        failedCharges++;
      }
    }

    // Add revenue aggregates by currency
    for (const [currency, amount] of currencyTotals.entries()) {
      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'stripe_revenue',
        value: amount,
        metadata: {
          source: 'stripe_charges_sync',
          currency,
          successfulCharges,
          failedCharges,
          period: '30_days',
        },
        dateRecorded: now,
      });
    }

    // 2. Sync Customers
    console.log('[Stripe Sync] Fetching customers...');
    const customers = await stripe.customers.list({
      limit: 100,
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
    });

    for (const customer of customers.data) {
      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'stripe_customer',
        value: 1,
        metadata: {
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
          currency: customer.currency,
          balance: customer.balance / 100,
          delinquent: customer.delinquent,
          createdAt: new Date(customer.created * 1000).toISOString(),
        },
        dateRecorded: new Date(customer.created * 1000),
      });
    }

    dataPoints.push({
      integrationId,
      organizationId,
      metricType: 'stripe_customers_total',
      value: customers.data.length,
      metadata: {
        source: 'stripe_customers_sync',
        period: '30_days',
      },
      dateRecorded: now,
    });

    // 3. Sync Subscriptions
    console.log('[Stripe Sync] Fetching subscriptions...');
    const subscriptions = await stripe.subscriptions.list({
      limit: 100,
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
    });

    let activeSubscriptions = 0;
    let canceledSubscriptions = 0;
    let trialSubscriptions = 0;
    let totalMRR = 0;

    for (const subscription of subscriptions.data) {
      // Calculate MRR from subscription
      let mrr = 0;
      for (const item of subscription.items.data) {
        const amount = item.price.unit_amount || 0;
        const quantity = item.quantity || 1;

        // Normalize to monthly
        if (item.price.recurring?.interval === 'year') {
          mrr += (amount * quantity) / 12 / 100;
        } else if (item.price.recurring?.interval === 'month') {
          mrr += (amount * quantity) / 100;
        }
      }

      if (subscription.status === 'active') {
        activeSubscriptions++;
        totalMRR += mrr;
      } else if (subscription.status === 'canceled') {
        canceledSubscriptions++;
      }

      if (subscription.status === 'trialing') {
        trialSubscriptions++;
      }

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'subscription',
        value: mrr,
        metadata: {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
          currentPeriodStart: new Date(
            subscription.current_period_start * 1000
          ).toISOString(),
          currentPeriodEnd: new Date(
            subscription.current_period_end * 1000
          ).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          trialEnd: subscription.trial_end
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null,
          mrr,
        },
        dateRecorded: new Date(subscription.created * 1000),
      });
    }

    // Add subscription aggregates
    dataPoints.push({
      integrationId,
      organizationId,
      metricType: 'stripe_subscriptions_active',
      value: activeSubscriptions,
      metadata: {
        source: 'stripe_subscriptions_sync',
        canceled: canceledSubscriptions,
        trialing: trialSubscriptions,
        totalMRR,
      },
      dateRecorded: now,
    });

    dataPoints.push({
      integrationId,
      organizationId,
      metricType: 'stripe_mrr',
      value: totalMRR,
      metadata: {
        source: 'stripe_subscriptions_sync',
        activeSubscriptions,
        period: '30_days',
      },
      dateRecorded: now,
    });

    // 4. Sync Payment Intents (for checkout sessions)
    console.log('[Stripe Sync] Fetching payment intents...');
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
    });

    let succeededPaymentIntents = 0;
    let failedPaymentIntents = 0;

    for (const intent of paymentIntents.data) {
      if (intent.status === 'succeeded') {
        succeededPaymentIntents++;
      } else if (intent.status === 'failed' || intent.status === 'canceled') {
        failedPaymentIntents++;
      }
    }

    dataPoints.push({
      integrationId,
      organizationId,
      metricType: 'stripe_payment_intents',
      value: paymentIntents.data.length,
      metadata: {
        source: 'stripe_payment_intents_sync',
        succeeded: succeededPaymentIntents,
        failed: failedPaymentIntents,
        period: '30_days',
      },
      dateRecorded: now,
    });

    // 5. Sync Refunds
    console.log('[Stripe Sync] Fetching refunds...');
    const refunds = await stripe.refunds.list({
      limit: 100,
      created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
    });

    let totalRefunded = 0;

    for (const refund of refunds.data) {
      const amount = refund.amount / 100;
      totalRefunded += amount;

      dataPoints.push({
        integrationId,
        organizationId,
        metricType: 'stripe_refund',
        value: amount,
        metadata: {
          refundId: refund.id,
          chargeId: refund.charge,
          currency: refund.currency.toUpperCase(),
          reason: refund.reason,
          status: refund.status,
        },
        dateRecorded: new Date(refund.created * 1000),
      });
    }

    dataPoints.push({
      integrationId,
      organizationId,
      metricType: 'stripe_refunds_total',
      value: totalRefunded,
      metadata: {
        source: 'stripe_refunds_sync',
        count: refunds.data.length,
        period: '30_days',
      },
      dateRecorded: now,
    });

    // Save all data points
    if (dataPoints.length > 0) {
      await prisma.dataPoint.createMany({ data: dataPoints });
      console.log(`[Stripe Sync] Created ${dataPoints.length} DataPoints`);
    }

    return {
      paymentsProcessed: charges.data.length,
      customersProcessed: customers.data.length,
      subscriptionsProcessed: subscriptions.data.length,
      refundsProcessed: refunds.data.length,
      dataPointsCreated: dataPoints.length,
      totalRevenue,
      totalMRR,
      totalRefunded,
      stats: {
        successfulCharges,
        failedCharges,
        activeSubscriptions,
        canceledSubscriptions,
        trialSubscriptions,
      },
    };
  } catch (error) {
    console.error('[Stripe Sync] Error:', error);
    throw error;
  }
}
