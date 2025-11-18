import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function handleError(error: unknown): NextResponse {
  // Log error for monitoring
  console.error('[ErrorHandler]', {
    error,
    timestamp: new Date().toISOString(),
    stack: error instanceof Error ? error.stack : undefined,
  })

  // Handle known application errors
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(error)
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Database validation error',
        code: 'DB_VALIDATION_ERROR',
      },
      { status: 400 }
    )
  }

  // Handle generic errors
  if (error instanceof Error) {
    // Don't expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development'

    return NextResponse.json(
      {
        success: false,
        error: isDev ? error.message : 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
        ...(isDev && { stack: error.stack }),
      },
      { status: 500 }
    )
  }

  // Unknown error type
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  )
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError): NextResponse {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const fields = (error.meta?.target as string[]) || []
      return NextResponse.json(
        {
          success: false,
          error: `A record with this ${fields.join(', ')} already exists`,
          code: 'DUPLICATE_RECORD',
          details: { fields },
        },
        { status: 409 }
      )

    case 'P2025':
      // Record not found
      return NextResponse.json(
        {
          success: false,
          error: 'Record not found',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      )

    case 'P2003':
      // Foreign key constraint failed
      return NextResponse.json(
        {
          success: false,
          error: 'Related record does not exist',
          code: 'FOREIGN_KEY_ERROR',
        },
        { status: 400 }
      )

    case 'P2014':
      // Required relation violation
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete record due to existing dependencies',
          code: 'DEPENDENCY_ERROR',
        },
        { status: 400 }
      )

    default:
      return NextResponse.json(
        {
          success: false,
          error: 'Database operation failed',
          code: 'DB_ERROR',
        },
        { status: 500 }
      )
  }
}

/**
 * Wrapper for API route handlers with automatic error handling
 */
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context)
    } catch (error) {
      return handleError(error)
    }
  }
}

/**
 * Error monitoring service integration
 */
export class ErrorMonitor {
  private static sentryEnabled = !!process.env.SENTRY_DSN

  static captureException(error: Error, context?: Record<string, any>) {
    // Log to console
    console.error('[ErrorMonitor]', {
      error,
      context,
      timestamp: new Date().toISOString(),
    })

    // In production, send to Sentry or similar service
    if (this.sentryEnabled && process.env.NODE_ENV === 'production') {
      // Sentry integration would go here
      // Sentry.captureException(error, { extra: context })
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    console.log(`[ErrorMonitor] [${level}]`, message)

    if (this.sentryEnabled && process.env.NODE_ENV === 'production') {
      // Sentry.captureMessage(message, level)
    }
  }

  static setUserContext(userId: string, email?: string) {
    if (this.sentryEnabled) {
      // Sentry.setUser({ id: userId, email })
    }
  }
}
