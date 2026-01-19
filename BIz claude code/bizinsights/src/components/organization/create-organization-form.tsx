'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Building2, Loader2, Sparkles } from 'lucide-react'
import { showToast } from '@/components/ui/toast-helper'

export function CreateOrganizationForm() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  const handleNameChange = (name: string) => {
    setFormData({
      name,
      slug: generateSlug(name)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast.error('Please enter an organization name')
      return
    }

    if (!formData.slug.trim()) {
      showToast.error('Please enter a valid slug')
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        showToast.success('Organization created successfully!')
        // Refresh the page to load the organization
        router.refresh()
      } else {
        const errorMessage = result.details
          ? `${result.error}: ${result.details}`
          : result.error || 'Failed to create organization'
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Error creating organization:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to create organization'
      showToast.error(errorMessage)
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md border-2 shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Welcome to BizInsights!</CardTitle>
            <CardDescription className="mt-2">
              Let's create your organization to get started
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Company"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                disabled={isCreating}
                className="h-11"
                required
              />
              <p className="text-sm text-muted-foreground">
                This will be the name of your workspace
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">bizinsights.com/</span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="my-company"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  disabled={isCreating}
                  className="h-11 flex-1"
                  pattern="[a-z0-9-]+"
                  required
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">What's next?</p>
                  <p className="text-blue-700">
                    After creating your organization, you'll be able to connect integrations like Shopify, Stripe, and more to start tracking your business metrics.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Organization...
                </>
              ) : (
                <>
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Organization
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
