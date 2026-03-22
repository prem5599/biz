import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import Stripe from 'stripe';

const router = Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-02-24.acacia' })
  : null;

// Get subscription status
router.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId as string },
      select: {
        id: true,
        subscriptionTier: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    let subscriptionDetails = null;

    if (stripe && organization.stripeSubscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(
          organization.stripeSubscriptionId
        );
        subscriptionDetails = {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };
      } catch (err) {
        console.error('Error fetching Stripe subscription:', err);
      }
    }

    res.json({
      success: true,
      data: {
        tier: organization.subscriptionTier,
        subscription: subscriptionDetails,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

// Create checkout session
router.post('/create-checkout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, plan } = req.body;

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    if (!organizationId || !plan) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        members: {
          where: { role: 'OWNER' },
          include: { user: true },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    const ownerEmail = (organization.members[0]?.user?.email || organization.billingEmail) || undefined;

    // Get or create Stripe customer
    let customerId = organization.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: ownerEmail,
        metadata: {
          organizationId: organization.id,
        },
      });
      customerId = customer.id;

      await prisma.organization.update({
        where: { id: organizationId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Price IDs would come from environment variables
    const priceIds: Record<string, string> = {
      PRO: process.env.STRIPE_PRO_PRICE_ID || 'price_pro',
      ENTERPRISE: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise',
    };

    const priceId = priceIds[plan];
    if (!priceId) {
      return res.status(400).json({ success: false, error: 'Invalid plan' });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/dashboard/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard/settings`,
      metadata: {
        organizationId,
        plan,
      },
    });

    res.json({ success: true, data: { url: session.url } });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout session' });
  }
});

// Cancel subscription
router.post('/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.body;

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization?.stripeSubscriptionId) {
      return res.status(400).json({ success: false, error: 'No active subscription' });
    }

    await stripe.subscriptions.update(organization.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    res.json({ success: true, message: 'Subscription will be cancelled at period end' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' });
  }
});

// Stripe webhook
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return res.status(400).json({ success: false, error: 'Missing signature' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { organizationId, plan } = session.metadata || {};

        if (organizationId && plan) {
          await prisma.organization.update({
            where: { id: organizationId },
            data: {
              subscriptionTier: plan,
              stripeSubscriptionId: session.subscription as string,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const org = await prisma.organization.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (org) {
          await prisma.organization.update({
            where: { id: org.id },
            data: {
              subscriptionTier: 'FREE',
              stripeSubscriptionId: null,
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// Get invoices
router.get('/invoices', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;

    if (!stripe) {
      return res.status(500).json({ success: false, error: 'Stripe not configured' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId as string },
    });

    if (!organization?.stripeCustomerId) {
      return res.json({ success: true, data: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: organization.stripeCustomerId,
      limit: 10,
    });

    const formattedInvoices = invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: invoice.status,
      date: new Date(invoice.created * 1000),
      pdfUrl: invoice.invoice_pdf,
    }));

    res.json({ success: true, data: formattedInvoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

export default router;
