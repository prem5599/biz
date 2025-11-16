'use client'

export default function DiagnosticPage() {
  // These env vars should be available on client side because they start with NEXT_PUBLIC_
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Environment Diagnostics</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <p className="font-semibold">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:</p>
          <p className="font-mono text-sm break-all">
            {publishableKey || '❌ NOT SET'}
          </p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <p className="font-semibold">Key Length:</p>
          <p>{publishableKey?.length || 0} characters</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="font-semibold text-yellow-900">Expected Format:</p>
          <p className="text-sm text-yellow-800">
            Should start with: <code>pk_test_</code> or <code>pk_live_</code>
            <br />
            Should be 100+ characters long
          </p>
        </div>
      </div>
    </div>
  )
}
