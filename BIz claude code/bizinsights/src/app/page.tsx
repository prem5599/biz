'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function Home() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && user) {
      router.push('/dashboard')
    }
  }, [user, isLoaded, router])

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div>
            <div className="flex justify-center mb-6">
              <BarChart3 className="h-16 w-16 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              BizInsights
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Simple Analytics Dashboard for Small Businesses
            </p>
            <p className="text-gray-500 mb-8">
              Connect your business tools and get AI-powered insights in plain English
            </p>
          </div>

          <div className="space-y-4">
            <Link href="/auth/signup">
              <Button size="lg" className="w-full">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <p className="text-sm text-gray-500">
              Free tier available • No credit card required
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 mt-12 text-sm text-gray-600">
            <div className="flex items-center justify-center space-x-2">
              <span>✓</span>
              <span>Connect Shopify, Stripe, Google Analytics</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span>✓</span>
              <span>AI-powered business insights</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <span>✓</span>
              <span>Automated reporting</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
