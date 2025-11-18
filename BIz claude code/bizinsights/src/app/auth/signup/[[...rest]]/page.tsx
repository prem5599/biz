'use client'

import { SignUp } from '@clerk/nextjs'
import { BarChart3 } from 'lucide-react'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BarChart3 className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-gray-600">
            Connect your first integration and get insights in under 2 minutes
          </p>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-xl",
                headerTitle: "text-2xl",
                headerSubtitle: "text-gray-600",
                socialButtonsBlockButton: "border-2 hover:border-blue-500 transition-colors h-12",
                socialButtonsBlockButtonText: "font-semibold",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
                footerActionLink: "text-blue-600 hover:text-blue-700",
              },
            }}
          />
        </div>

        {/* Footer Note */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <a
              href="/auth/signin"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
