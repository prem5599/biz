'use client'

import { useState } from 'react'
import { signIn } from "next-auth/react"
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { BarChart3, Mail, Eye, EyeOff } from 'lucide-react'

export default function SignIn() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else if (result?.ok) {
        // Check if user is new or has no integrations
        const orgResponse = await fetch('/api/organizations')
        const orgData = await orgResponse.json()

        if (orgData.success && orgData.data.length > 0) {
          const org = orgData.data[0]
          const dashResponse = await fetch(`/api/organizations/${org.id}/dashboard`)
          const dashData = await dashResponse.json()

          // Redirect to integrations if no integrations connected
          if (dashData.success && dashData.data.integrations?.length === 0) {
            window.location.href = '/dashboard/integrations/easy?welcome=true'
          } else {
            window.location.href = '/dashboard'
          }
        } else {
          window.location.href = '/dashboard'
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/dashboard/integrations/easy?welcome=true' })
  }

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

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Quick Sign In</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign-in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Demo Account Notice */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <p className="text-blue-800 font-medium mb-1">Quick Demo Access</p>
              <p className="text-blue-700 text-xs">
                Use <span className="font-mono bg-blue-100 px-1 rounded">test@example.com</span> / <span className="font-mono bg-blue-100 px-1 rounded">password123</span> or create your account below
              </p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className="pl-10"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center space-y-2">
              <Link
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot your password?
              </Link>
              <p className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link
                  href="/auth/signup"
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}