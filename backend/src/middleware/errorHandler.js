/**
 * Centralized CareSync Express Error Handler
 * Sanitizes errors and ensures safe responses without leaking internal credentials or stack traces
 */

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  
  // Log error details for server diagnostics
  console.error(`💥 [API Error] ${req.method} ${req.originalUrl}:`, {
    message: err.message,
    code: err.code,
    status: statusCode,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Client-safe response
  res.status(statusCode).json({
    success: false,
    error: err.isCustom ? err.message : (statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'An unexpected server error occurred. Our team has been notified.' 
      : err.message),
    code: err.code || 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 404 Route Not Found Handler
 */
export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  });
}

export default {
  errorHandler,
  notFoundHandler,
};
