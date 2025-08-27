'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useCurrentOrganization } from '@/hooks/useOrganization'

interface CurrencyContextType {
  currency: string
  setCurrency: (currency: string) => void
  isLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<string>('USD')
  const [isLoading, setIsLoading] = useState(true)
  const { organization } = useCurrentOrganization()

  // Load currency from organization settings
  useEffect(() => {
    const loadCurrency = async () => {
      if (!organization?.id) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/organization/settings?organizationId=${organization.id}`)
        const data = await response.json()
        
        if (data.success && data.data.currency) {
          setCurrency(data.data.currency)
        }
      } catch (error) {
        console.error('Error loading currency setting:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCurrency()
  }, [organization?.id])

  // Update currency setting in backend when changed
  const updateCurrency = async (newCurrency: string) => {
    setCurrency(newCurrency)
    
    if (!organization?.id) return

    try {
      await fetch('/api/organization/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id,
          currency: newCurrency
        })
      })
    } catch (error) {
      console.error('Error updating currency setting:', error)
    }
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency: updateCurrency,
      isLoading
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}