"use client"

import { useState, useCallback } from 'react'

interface NotificationData {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  details?: string[]
  actionLabel?: string
  onAction?: () => void
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationData | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const showNotification = useCallback((data: NotificationData) => {
    setNotification(data)
    setIsOpen(true)
  }, [])

  const closeNotification = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => setNotification(null), 150) // Wait for animation
  }, [])

  const showSuccess = useCallback((title: string, message: string, details?: string[]) => {
    showNotification({ type: 'success', title, message, details })
  }, [showNotification])

  const showError = useCallback((title: string, message: string, details?: string[]) => {
    showNotification({ type: 'error', title, message, details })
  }, [showNotification])

  const showWarning = useCallback((title: string, message: string, details?: string[]) => {
    showNotification({ type: 'warning', title, message, details })
  }, [showNotification])

  const showInfo = useCallback((title: string, message: string, details?: string[]) => {
    showNotification({ type: 'info', title, message, details })
  }, [showNotification])

  return {
    notification,
    isOpen,
    showNotification,
    closeNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}