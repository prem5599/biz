'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          {children}
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              },
              success: {
                duration: 4000,
                style: {
                  background: '#f0f9ff',
                  color: '#0c4a6e',
                  border: '1px solid #0ea5e9',
                },
              },
              error: {
                duration: 6000,
                style: {
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #ef4444',
                },
              },
            }}
          />
        </CurrencyProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
