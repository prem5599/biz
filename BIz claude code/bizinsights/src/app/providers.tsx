'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CurrencyProvider } from '@/contexts/CurrencyContext'
import { useState } from 'react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        {children}
        <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerClassName=""
            containerStyle={{}}
            toastOptions={{
              className: '',
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                padding: '12px 16px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              },
              success: {
                duration: 4000,
                style: {
                  background: '#f0f9ff',
                  color: '#0c4a6e',
                  border: '1px solid #0ea5e9',
                },
                iconTheme: {
                  primary: '#0ea5e9',
                  secondary: '#f0f9ff',
                },
              },
              error: {
                duration: 6000,
                style: {
                  background: '#fef2f2',
                  color: '#991b1b',
                  border: '1px solid #ef4444',
                },
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fef2f2',
                },
              },
              loading: {
                style: {
                  background: '#fefbf3',
                  color: '#a16207',
                  border: '1px solid #f59e0b',
                },
                iconTheme: {
                  primary: '#f59e0b',
                  secondary: '#fefbf3',
                },
              },
            }}
          />
      </CurrencyProvider>
    </QueryClientProvider>
  )
}