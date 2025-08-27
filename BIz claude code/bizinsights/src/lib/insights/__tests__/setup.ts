// Test setup file for insights engine tests

// Mock Prisma client
jest.mock('../../prisma', () => ({
  prisma: {
    dataPoint: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn()
    },
    organizationSettings: {
      findUnique: jest.fn()
    },
    organization: {
      findUnique: jest.fn()
    },
    integration: {
      findMany: jest.fn()
    },
    insight: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn()
    },
    alert: {
      findMany: jest.fn(),
      update: jest.fn()
    },
    organizationMember: {
      findFirst: jest.fn()
    },
    userSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn()
    }
  }
}))

// Mock date-fns functions
jest.mock('date-fns', () => ({
  subDays: jest.fn((date, days) => new Date(date.getTime() - days * 24 * 60 * 60 * 1000)),
  startOfDay: jest.fn(date => new Date(date.getFullYear(), date.getMonth(), date.getDate())),
  endOfDay: jest.fn(date => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)),
  addMinutes: jest.fn((date, minutes) => new Date(date.getTime() + minutes * 60 * 1000)),
  addHours: jest.fn((date, hours) => new Date(date.getTime() + hours * 60 * 60 * 1000)),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  isAfter: jest.fn((date1, date2) => date1.getTime() > date2.getTime()),
  isBefore: jest.fn((date1, date2) => date1.getTime() < date2.getTime()),
  differenceInDays: jest.fn((date1, date2) => Math.ceil((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24))),
  format: jest.fn((date, formatStr) => date.toISOString()),
  parseISO: jest.fn(dateStr => new Date(dateStr)),
  isValid: jest.fn(date => !isNaN(date.getTime())),
  isWeekend: jest.fn(date => {
    const day = date.getDay()
    return day === 0 || day === 6
  }),
  getMonth: jest.fn(date => date.getMonth()),
  startOfMonth: jest.fn(date => new Date(date.getFullYear(), date.getMonth(), 1)),
  endOfMonth: jest.fn(date => new Date(date.getFullYear(), date.getMonth() + 1, 0)),
  subMonths: jest.fn((date, months) => new Date(date.getFullYear(), date.getMonth() - months, date.getDate()))
}))

// Mock d3-array functions
jest.mock('d3-array', () => ({
  mean: jest.fn(arr => arr.reduce((sum, val) => sum + val, 0) / arr.length),
  median: jest.fn(arr => {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
  }),
  deviation: jest.fn(arr => {
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length
    const squaredDiffs = arr.map(val => Math.pow(val - mean, 2))
    return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / arr.length)
  }),
  quantile: jest.fn((arr, q) => {
    const sorted = [...arr].sort((a, b) => a - b)
    const index = (sorted.length - 1) * q
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index % 1
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  })
}))

// Mock simple-statistics
jest.mock('simple-statistics', () => ({
  sampleCorrelation: jest.fn((x, y) => {
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)
    
    const numerator = n * sumXY - sumX * sumY
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY))
    
    return denominator === 0 ? 0 : numerator / denominator
  }),
  variance: jest.fn(arr => {
    const mean = arr.reduce((sum, val) => sum + val, 0) / arr.length
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (arr.length - 1)
  })
}))

// Mock ml-regression
jest.mock('ml-regression', () => ({
  SimpleLinearRegression: jest.fn().mockImplementation((x, y) => ({
    slope: 1,
    intercept: 0,
    predict: jest.fn(val => val * 1 + 0)
  }))
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}))

// Global test utilities
global.createMockMetricData = (count: number, baseValue: number = 100, trend: number = 0) => {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(2024, 0, i + 1),
    value: baseValue + (i * trend) + (Math.random() * 10 - 5),
    source: 'shopify' as const,
    metricType: 'revenue' as const,
    metadata: { test: true }
  }))
}

global.createMockBusinessContext = () => ({
  businessSize: 'small' as const,
  primaryChannels: ['shopify', 'stripe'],
  seasonalBusiness: false,
  businessModel: 'b2c' as const,
  monthlyRevenue: 10000
})

// Suppress console warnings in tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = jest.fn()
  console.error = jest.fn()
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})