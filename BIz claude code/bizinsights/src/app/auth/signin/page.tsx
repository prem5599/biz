'use client'

import { SignIn } from '@clerk/nextjs'
import { BarChart3 } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BarChart3 className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to BizInsights
          </h1>
          <p className="text-gray-600">
            Sign in and connect your first integration in under 2 minutes
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-xl",
                headerTitle: "text-2xl",
                headerSubtitle: "text-gray-600",
                socialButtonsBlockButton: "border-2 hover:border-blue-500 transition-colors",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                footerActionLink: "text-blue-600 hover:text-blue-700",
              },
            }}
            redirectUrl="/dashboard/integrations/easy?welcome=true"
            signUpUrl="/auth/signup"
          />
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <a
              href="/auth/signup"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign up for free
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
