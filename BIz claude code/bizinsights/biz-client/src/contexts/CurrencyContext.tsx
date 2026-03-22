import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { useCurrentOrganization } from '../hooks/useOrganization';

export type Currency = 'USD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'AUD' | 'CAD';

export const SUPPORTED_CURRENCIES: Record<Currency, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
};

export function formatCurrency(value: number, currency: Currency | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const stored = localStorage.getItem('currency');
    return (stored as Currency) || 'USD';
  });
  const [isLoading, setIsLoading] = useState(true);
  const { organization } = useCurrentOrganization();

  useEffect(() => {
    const loadCurrency = async () => {
      if (!organization?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get('/organization/settings', {
          params: { organizationId: organization.id },
        });

        if (response.data.success && response.data.data?.currency) {
          setCurrencyState(response.data.data.currency);
          localStorage.setItem('currency', response.data.data.currency);
        }
      } catch (error) {
        console.error('Error loading currency setting:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, [organization?.id]);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem('currency', newCurrency);

    if (!organization?.id) return;

    try {
      await api.put('/organization/settings', {
        organizationId: organization.id,
        currency: newCurrency,
      });
    } catch (error) {
      console.error('Error updating currency setting:', error);
    }
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        isLoading,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
