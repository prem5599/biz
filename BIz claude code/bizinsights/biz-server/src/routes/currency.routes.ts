import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// In-memory exchange rate cache
let ratesCache: { rates: Record<string, number>; updatedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110,
  CNY: 6.4,
  INR: 83,
  AUD: 1.35,
  CAD: 1.25,
  SGD: 1.35,
  HKD: 7.78,
  KRW: 1300,
  THB: 35,
  MYR: 4.7,
  IDR: 15500,
  VND: 24000,
  PHP: 56,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  BHD: 0.38,
  OMR: 0.38,
  ZAR: 18.5,
  EGP: 30.9,
  BRL: 5.2,
  MXN: 17.5,
  ARS: 350,
  CLP: 870,
  COP: 4000,
  PEN: 3.7,
  CHF: 0.89,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  PLN: 4.1,
  CZK: 22.5,
  HUF: 355,
  RON: 4.6,
  BGN: 1.8,
  RUB: 90,
  UAH: 37,
  KZT: 450,
  NGN: 775,
  KES: 155,
  GHS: 12,
  TZS: 2500,
  UGX: 3750,
  PKR: 280,
  BDT: 110,
  LKR: 320,
  NPR: 133,
};

async function getExchangeRates(): Promise<Record<string, number>> {
  if (ratesCache && Date.now() - ratesCache.updatedAt < CACHE_TTL) {
    return ratesCache.rates;
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');

    if (!response.ok) {
      throw new Error('Exchange rate API request failed');
    }

    const data = await response.json();
    ratesCache = { rates: data.rates as Record<string, number>, updatedAt: Date.now() };
    return ratesCache.rates;
  } catch (error) {
    console.error('Failed to fetch exchange rates, using fallback:', error);
    ratesCache = { rates: FALLBACK_RATES, updatedAt: Date.now() };
    return FALLBACK_RATES;
  }
}

// GET /api/currency/rates - Return all exchange rates (USD base)
router.get('/rates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const rates = await getExchangeRates();
    const isStale = ratesCache ? Date.now() - ratesCache.updatedAt > CACHE_TTL : true;

    res.json({
      success: true,
      data: {
        rates,
        baseCurrency: 'USD',
        updatedAt: ratesCache?.updatedAt ? new Date(ratesCache.updatedAt).toISOString() : null,
        isFallback: isStale,
      },
    });
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exchange rates' });
  }
});

// POST /api/currency/convert - Convert an amount between currencies
router.post('/convert', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount, from, to } = req.body;

    if (amount === undefined || !from || !to) {
      return res.status(400).json({ success: false, error: 'amount, from, and to are required' });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
      return res.status(400).json({ success: false, error: 'amount must be a valid number' });
    }

    const rates = await getExchangeRates();
    const fromCurrency = (from as string).toUpperCase();
    const toCurrency = (to as string).toUpperCase();

    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;

    // Convert via USD as base
    const usdAmount = numericAmount / fromRate;
    const convertedAmount = usdAmount * toRate;
    const exchangeRate = toRate / fromRate;

    res.json({
      success: true,
      data: {
        originalAmount: numericAmount,
        from: fromCurrency,
        to: toCurrency,
        convertedAmount,
        exchangeRate,
        convertedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error converting currency:', error);
    res.status(500).json({ success: false, error: 'Failed to convert currency' });
  }
});

export default router;
