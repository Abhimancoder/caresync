/**
 * Standardized API Response Helper for CareSync
 * Enforces consistent JSON envelope structure across all endpoints:
 * - Success: { success: true, data: ..., meta: ... }
 * - Error:   { success: false, error: ..., code: ..., details: ... }
 */

export function apiSuccess(res, data, meta = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(Object.keys(meta).length > 0 ? { meta } : {}),
  });
}

export function apiCreated(res, data, message = 'Resource created successfully') {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
}

export function apiError(res, message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(details ? { details } : {}),
  });
}

export default {
  apiSuccess,
  apiCreated,
  apiError,
};
