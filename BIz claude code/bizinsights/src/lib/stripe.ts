import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build', {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
})

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      '1 integration',
      'Basic dashboard',
      'Monthly reports',
      'Email support'
    ],
    limits: {
      integrations: 1,
      dataRetention: 90, // days
      apiCalls: 1000 // per month
    }
  },
  PRO: {
    name: 'Pro',
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      '3 integrations',
      'AI insights',
      'Weekly reports',
      'Priority support',
      'Custom dashboards'
    ],
    limits: {
      integrations: 3,
      dataRetention: 365, // days
      apiCalls: 10000 // per month
    }
  },
  BUSINESS: {
    name: 'Business',
    price: 79,
    priceId: process.env.STRIPE_BUSINESS_PRICE_ID,
    features: [
      'Unlimited integrations',
      'Advanced AI insights',
      'Daily reports',
      'Team collaboration',
      'API access',
      'Priority support'
    ],
    limits: {
      integrations: -1, // unlimited
      dataRetention: 730, // days
      apiCalls: 100000 // per month
    }
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 199,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Business',
      'Custom integrations',
      'White-label',
      'Dedicated support',
      'SLA guarantee',
      'Custom contracts'
    ],
    limits: {
      integrations: -1, // unlimited
      dataRetention: -1, // unlimited
      apiCalls: -1 // unlimited
    }
  }
} as const

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS