import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    return NextResponse.json(
      { error: 'Webhook handling failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId
  const planType = session.metadata?.planType

  if (!organizationId || !planType) {
    console.error('Missing metadata in checkout session')
    return
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionTier: planType as any,
      billingEmail: session.customer_email
    }
  })

  console.log(`Subscription activated for organization ${organizationId} with plan ${planType}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    console.error('Missing organizationId in subscription metadata')
    return
  }

  const isActive = subscription.status === 'active'
  
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      // Update based on subscription status
      subscriptionTier: isActive ? subscription.metadata?.planType as any || 'FREE' : 'FREE'
    }
  })

  console.log(`Subscription updated for organization ${organizationId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    console.error('Missing organizationId in subscription metadata')
    return
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      subscriptionTier: 'FREE'
    }
  })

  console.log(`Subscription cancelled for organization ${organizationId}`)
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for customer ${invoice.customer}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log(`Payment failed for customer ${invoice.customer}`)
}