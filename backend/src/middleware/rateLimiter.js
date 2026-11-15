import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for sensitive passcode verification and authentication endpoints.
 * Protects elderly profiles from brute-force passcode guessing attacks.
 */
export const invitationVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 passcode attempts per windowMs
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many invalid passcode attempts from this IP. For security reasons, please try again in 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

/**
 * General API rate limiter for standard endpoints.
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again later.',
    code: 'TOO_MANY_REQUESTS',
  },
});

export default {
  invitationVerificationLimiter,
  generalApiLimiter,
};
