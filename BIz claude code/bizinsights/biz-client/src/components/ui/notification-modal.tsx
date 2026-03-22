"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string[]
  actionLabel?: string
  onAction?: () => void
}

export function NotificationModal({
  isOpen,
  onClose,
  type = 'info',
  title,
  message,
  details,
  actionLabel,
  onAction
}: NotificationModalProps) {
  const getIcon = () => {
    const iconProps = { className: "h-6 w-6" }
    
    switch (type) {
      case 'success':
        return <CheckCircle {...iconProps} className="h-6 w-6 text-green-600" />
      case 'error':
        return <XCircle {...iconProps} className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertCircle {...iconProps} className="h-6 w-6 text-yellow-600" />
      default:
        return <Info {...iconProps} className="h-6 w-6 text-blue-600" />
    }
  }

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800'
        }
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800'
        }
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800'
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800'
        }
    }
  }

  const colors = getColors()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full",
              colors.bg,
              colors.border,
              "border"
            )}>
              {getIcon()}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {title}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <DialogDescription className="text-gray-600">
            {message}
          </DialogDescription>
          
          {details && details.length > 0 && (
            <div className={cn(
              "p-4 rounded-lg border",
              colors.bg,
              colors.border
            )}>
              <div className="space-y-2">
                {details.map((detail, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                    <p className={cn("text-sm", colors.text)}>
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {actionLabel && onAction && (
              <Button onClick={onAction}>
                {actionLabel}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}