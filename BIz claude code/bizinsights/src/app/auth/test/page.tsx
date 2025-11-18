'use client'

import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'

export default function TestAuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 space-y-6">
        <h1 className="text-2xl font-bold text-center">Authentication Status</h1>

        <SignedIn>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-900 font-semibold">✅ You are signed in!</p>
            </div>

            <div className="flex justify-center">
              <UserButton afterSignOutUrl="/auth/test" />
            </div>

            <p className="text-sm text-gray-600 text-center">
              Click your avatar above to sign out
            </p>

            <Link
              href="/dashboard/integrations/easy?welcome=true"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-900 font-semibold">⚠️ You are signed out</p>
            </div>

            <Link
              href="/auth/signin"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md text-center transition-colors"
            >
              Sign In
            </Link>
          </div>
        </SignedOut>
      </div>
    </div>
  )
}
