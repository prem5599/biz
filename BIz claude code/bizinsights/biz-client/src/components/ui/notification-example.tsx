'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { showToast } from './toast-helper'

export function NotificationExample() {
  const handleSuccess = () => {
    showToast.success(' Report generated successfully! Your file is ready for download.')
  }

  const handleError = () => {
    showToast.error(' Failed to generate report: Invalid organization ID or insufficient permissions.')
  }

  const handleWarning = () => {
    showToast.warning(' This report contains sensitive data. Please handle with care.')
  }

  const handleInfo = () => {
    showToast.info(' Report generation typically takes 30-60 seconds depending on data volume.')
  }

  const handleLoading = () => {
    const loadingToast = showToast.loading('🔄 Generating your business report...')
    
    // Simulate async operation
    setTimeout(() => {
      showToast.success(' Report completed successfully!', { id: loadingToast })
    }, 3000)
  }

  const handlePromise = () => {
    const generateReport = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.5) {
          resolve('Report generated successfully!')
        } else {
          reject('Failed to generate report due to server error')
        }
      }, 2000)
    })

    showToast.promise(generateReport, {
      loading: '🔄 Generating report...',
      success: (data) => `✅ ${data}`,
      error: (error) => `❌ ${error}`,
    })
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Toast Notification Examples</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={handleSuccess} variant="default">
            Success Toast
          </Button>
          <Button onClick={handleError} variant="destructive">
            Error Toast
          </Button>
          <Button onClick={handleWarning} variant="outline">
            Warning Toast
          </Button>
          <Button onClick={handleInfo} variant="secondary">
            Info Toast
          </Button>
          <Button onClick={handleLoading} variant="outline">
            Loading Toast
          </Button>
          <Button onClick={handlePromise} variant="default">
            Promise Toast
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}