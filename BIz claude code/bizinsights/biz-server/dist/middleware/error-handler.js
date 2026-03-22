"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMonitor = exports.AppError = void 0;
exports.handleError = handleError;
exports.withErrorHandler = withErrorHandler;
const server_1 = require("next/server");
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
class AppError extends Error {
    constructor(statusCode, message, code, details) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.code = code;
        this.details = details;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function handleError(error) {
    // Log error for monitoring
    console.error('[ErrorHandler]', {
        error,
        timestamp: new Date().toISOString(),
        stack: error instanceof Error ? error.stack : undefined,
    });
    // Handle known application errors
    if (error instanceof AppError) {
        return server_1.NextResponse.json({
            success: false,
            error: error.message,
            code: error.code,
            details: error.details,
        }, { status: error.statusCode });
    }
    // Handle Zod validation errors
    if (error instanceof zod_1.ZodError) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: error.errors.map((err) => ({
                path: err.path.join('.'),
                message: err.message,
            })),
        }, { status: 400 });
    }
    // Handle Prisma errors
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        return handlePrismaError(error);
    }
    if (error instanceof client_1.Prisma.PrismaClientValidationError) {
        return server_1.NextResponse.json({
            success: false,
            error: 'Database validation error',
            code: 'DB_VALIDATION_ERROR',
        }, { status: 400 });
    }
    // Handle generic errors
    if (error instanceof Error) {
        // Don't expose internal errors in production
        const isDev = process.env.NODE_ENV === 'development';
        return server_1.NextResponse.json({
            success: false,
            error: isDev ? error.message : 'An unexpected error occurred',
            code: 'INTERNAL_ERROR',
            ...(isDev && { stack: error.stack }),
        }, { status: 500 });
    }
    // Unknown error type
    return server_1.NextResponse.json({
        success: false,
        error: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
    }, { status: 500 });
}
function handlePrismaError(error) {
    switch (error.code) {
        case 'P2002':
            // Unique constraint violation
            const fields = error.meta?.target || [];
            return server_1.NextResponse.json({
                success: false,
                error: `A record with this ${fields.join(', ')} already exists`,
                code: 'DUPLICATE_RECORD',
                details: { fields },
            }, { status: 409 });
        case 'P2025':
            // Record not found
            return server_1.NextResponse.json({
                success: false,
                error: 'Record not found',
                code: 'NOT_FOUND',
            }, { status: 404 });
        case 'P2003':
            // Foreign key constraint failed
            return server_1.NextResponse.json({
                success: false,
                error: 'Related record does not exist',
                code: 'FOREIGN_KEY_ERROR',
            }, { status: 400 });
        case 'P2014':
            // Required relation violation
            return server_1.NextResponse.json({
                success: false,
                error: 'Cannot delete record due to existing dependencies',
                code: 'DEPENDENCY_ERROR',
            }, { status: 400 });
        default:
            return server_1.NextResponse.json({
                success: false,
                error: 'Database operation failed',
                code: 'DB_ERROR',
            }, { status: 500 });
    }
}
/**
 * Wrapper for API route handlers with automatic error handling
 */
function withErrorHandler(handler) {
    return async (request, context) => {
        try {
            return await handler(request, context);
        }
        catch (error) {
            return handleError(error);
        }
    };
}
/**
 * Error monitoring service integration
 */
class ErrorMonitor {
    static captureException(error, context) {
        // Log to console
        console.error('[ErrorMonitor]', {
            error,
            context,
            timestamp: new Date().toISOString(),
        });
        // In production, send to Sentry or similar service
        if (this.sentryEnabled && process.env.NODE_ENV === 'production') {
            // Sentry integration would go here
            // Sentry.captureException(error, { extra: context })
        }
    }
    static captureMessage(message, level = 'info') {
        console.log(`[ErrorMonitor] [${level}]`, message);
        if (this.sentryEnabled && process.env.NODE_ENV === 'production') {
            // Sentry.captureMessage(message, level)
        }
    }
    static setUserContext(userId, email) {
        if (this.sentryEnabled) {
            // Sentry.setUser({ id: userId, email })
        }
    }
}
exports.ErrorMonitor = ErrorMonitor;
ErrorMonitor.sentryEnabled = !!process.env.SENTRY_DSN;
//# sourceMappingURL=error-handler.js.map