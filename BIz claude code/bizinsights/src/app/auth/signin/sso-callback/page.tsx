'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'

export default function SSOCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">
          Completing sign-in...
        </h2>
        <p className="text-gray-600">
          Please wait while we redirect you to your dashboard
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
