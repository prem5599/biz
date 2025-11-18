'use client'

import { useSearchParams } from 'next/navigation'
import { AlertCircle, BarChart3, ExternalLink } from 'lucide-react'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, { title: string; description: string; solution: string }> = {
    Configuration: {
      title: 'Clerk Configuration Error',
      description: 'Your Clerk API keys are missing or invalid.',
      solution: 'Please add valid Clerk API keys to your .env file. Check the CLERK_SETUP.md file for instructions.',
    },
    AccessDenied: {
      title: 'Access Denied',
      description: 'You do not have permission to sign in.',
      solution: 'Please contact support if you believe this is an error.',
    },
    Verification: {
      title: 'Verification Error',
      description: 'The verification link is invalid or has expired.',
      solution: 'Please try signing in again and check your email for a new verification link.',
    },
    Default: {
      title: 'Authentication Error',
      description: 'An error occurred during authentication.',
      solution: 'Please try again or contact support if the problem persists.',
    },
  }

  const errorInfo = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BarChart3 className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BizInsights
          </h1>
        </div>

        {/* Error Card */}
        <div className="bg-white rounded-lg shadow-xl p-6 space-y-4">
          <div className="flex items-center space-x-3 text-red-600">
            <AlertCircle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">{errorInfo.title}</h2>
          </div>

          <div className="space-y-3">
            <p className="text-gray-700">{errorInfo.description}</p>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-900 font-medium">Solution:</p>
              <p className="text-sm text-blue-800 mt-1">{errorInfo.solution}</p>
            </div>

            {error === 'Configuration' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-900 font-medium mb-2">Setup Steps:</p>
                <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                  <li>Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">Clerk Dashboard</a></li>
                  <li>Create or select your application</li>
                  <li>Copy your API keys from the "API Keys" section</li>
                  <li>Update the .env file with real keys</li>
                  <li>Restart your development server</li>
                </ol>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col space-y-2 pt-4">
            <Link
              href="/auth/signin"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
            >
              Try Again
            </Link>

            {error === 'Configuration' && (
              <a
                href="https://dashboard.clerk.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-md text-center transition-colors flex items-center justify-center space-x-2"
              >
                <span>Open Clerk Dashboard</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                <strong>Error Code:</strong> {error || 'Unknown'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
