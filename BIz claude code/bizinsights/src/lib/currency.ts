import { Prisma } from '@prisma/client'

export interface CurrencyRate {
  code: string
  rate: number
  symbol: string
  name: string
}

export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; name: string }> = {
  // Major Global Currencies
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  
  // Indian Subcontinent
  INR: { symbol: '₹', name: 'Indian Rupee' },
  PKR: { symbol: 'Rs', name: 'Pakistani Rupee' },
  BDT: { symbol: '৳', name: 'Bangladeshi Taka' },
  LKR: { symbol: 'Rs', name: 'Sri Lankan Rupee' },
  NPR: { symbol: 'Rs', name: 'Nepalese Rupee' },
  
  // Asia Pacific
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  VND: { symbol: '₫', name: 'Vietnamese Dong' },
  PHP: { symbol: '₱', name: 'Philippine Peso' },
  
  // Middle East & Africa
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  SAR: { symbol: 'ر.س', name: 'Saudi Riyal' },
  QAR: { symbol: 'ر.ق', name: 'Qatari Riyal' },
  KWD: { symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  BHD: { symbol: '.د.ب', name: 'Bahraini Dinar' },
  OMR: { symbol: 'ر.ع.', name: 'Omani Rial' },
  ZAR: { symbol: 'R', name: 'South African Rand' },
  EGP: { symbol: 'ج.م', name: 'Egyptian Pound' },
  
  // Latin America
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  MXN: { symbol: '$', name: 'Mexican Peso' },
  ARS: { symbol: '$', name: 'Argentine Peso' },
  CLP: { symbol: '$', name: 'Chilean Peso' },
  COP: { symbol: '$', name: 'Colombian Peso' },
  PEN: { symbol: 'S/', name: 'Peruvian Sol' },
  
  // Europe
  CHF: { symbol: 'Fr', name: 'Swiss Franc' },
  SEK: { symbol: 'kr', name: 'Swedish Krona' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', name: 'Danish Krone' },
  PLN: { symbol: 'zł', name: 'Polish Zloty' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint' },
  RON: { symbol: 'lei', name: 'Romanian Leu' },
  BGN: { symbol: 'лв', name: 'Bulgarian Lev' },
  
  // Eastern Europe & Russia
  RUB: { symbol: '₽', name: 'Russian Ruble' },
  UAH: { symbol: '₴', name: 'Ukrainian Hryvnia' },
  KZT: { symbol: '₸', name: 'Kazakhstani Tenge' },
  
  // Africa
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling' },
  GHS: { symbol: '₵', name: 'Ghanaian Cedi' },
  TZS: { symbol: 'TSh', name: 'Tanzanian Shilling' },
  UGX: { symbol: 'USh', name: 'Ugandan Shilling' }
}

export interface ConversionResult {
  originalAmount: number
  originalCurrency: string
  convertedAmount: number
  targetCurrency: string
  exchangeRate: number
  convertedAt: Date
}

export class CurrencyConverter {
  private exchangeRates: Map<string, number> = new Map()
  private baseCurrency = 'USD'
  private lastUpdated: Date | null = null

  async updateExchangeRates(): Promise<void> {
    try {
      // Use a free exchange rate API (you can replace with your preferred service)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${this.baseCurrency}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates')
      }

      const data = await response.json()
      
      // Store rates
      for (const [currency, rate] of Object.entries(data.rates)) {
        this.exchangeRates.set(currency, rate as number)
      }
      
      this.lastUpdated = new Date()
    } catch (error) {
      console.error('Error updating exchange rates:', error)
      
      // Fallback to approximate rates if API fails
      this.setFallbackRates()
    }
  }

  private setFallbackRates(): void {
    // Approximate exchange rates as fallback (update these periodically)
    const fallbackRates = {
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110,
      CNY: 6.4,
      INR: 83,
      AUD: 1.35,
      CAD: 1.25,
      SGD: 1.35,
      AED: 3.67,
      SAR: 3.75,
      BRL: 5.2,
      MXN: 18,
      ZAR: 15
    }

    for (const [currency, rate] of Object.entries(fallbackRates)) {
      this.exchangeRates.set(currency, rate)
    }
    
    this.lastUpdated = new Date()
  }

  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string = 'USD'
  ): Promise<ConversionResult> {
    // Update rates if they're stale (older than 1 hour)
    if (!this.lastUpdated || Date.now() - this.lastUpdated.getTime() > 3600000) {
      await this.updateExchangeRates()
    }

    const fromRate = this.exchangeRates.get(fromCurrency.toUpperCase()) || 1
    const toRate = this.exchangeRates.get(toCurrency.toUpperCase()) || 1
    
    // Convert to USD first, then to target currency
    const usdAmount = amount / fromRate
    const convertedAmount = usdAmount * toRate
    const exchangeRate = toRate / fromRate

    return {
      originalAmount: amount,
      originalCurrency: fromCurrency.toUpperCase(),
      convertedAmount,
      targetCurrency: toCurrency.toUpperCase(),
      exchangeRate,
      convertedAt: new Date()
    }
  }

  formatCurrency(amount: number, currency: string, locale?: string): string {
    const currencyInfo = SUPPORTED_CURRENCIES[currency.toUpperCase()]
    
    if (!currencyInfo) {
      return `${amount} ${currency}`
    }

    // Use locale-specific formatting if provided
    if (locale) {
      try {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currency.toUpperCase()
        }).format(amount)
      } catch (error) {
        // Fallback to manual formatting
      }
    }

    // Manual formatting with currency symbol
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)

    return `${currencyInfo.symbol}${formattedAmount}`
  }

  getCurrencySymbol(currency: string): string {
    return SUPPORTED_CURRENCIES[currency.toUpperCase()]?.symbol || currency
  }

  getSupportedCurrencies(): Array<{ code: string; symbol: string; name: string }> {
    return Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => ({
      code,
      symbol: info.symbol,
      name: info.name
    }))
  }

  // Convert DataPoint values to a standard currency for analytics
  async normalizeDataPointValue(
    value: Prisma.Decimal,
    currency: string,
    targetCurrency: string = 'USD'
  ): Promise<number> {
    const numericValue = typeof value === 'number' ? value : parseFloat(value.toString())
    
    if (currency.toUpperCase() === targetCurrency.toUpperCase()) {
      return numericValue
    }

    const conversion = await this.convertCurrency(numericValue, currency, targetCurrency)
    return conversion.convertedAmount
  }
}

// Singleton instance
export const currencyConverter = new CurrencyConverter()

// Helper function for components
export function formatCurrency(amount: number, currency: string = 'USD', locale?: string): string {
  return currencyConverter.formatCurrency(amount, currency, locale)
}

// Helper to get currency symbol
export function getCurrencySymbol(currency: string): string {
  return currencyConverter.getCurrencySymbol(currency)
}