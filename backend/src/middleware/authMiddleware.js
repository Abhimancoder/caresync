import { auth } from '../config/firebaseAdmin.js';
import { USER_ROLES } from '../config/constants.js';

/**
 * Synthetic Demo Users for evaluation when live Firebase Auth credentials are unavailable
 */
export const DEMO_USERS = {
  'demo-elderly': {
    uid: 'demo-elderly-robert',
    email: 'robert.harrison@caresync.health',
    displayName: 'Robert Harrison (Senior)',
    role: USER_ROLES.ELDERLY,
    assignedProfiles: ['demo-profile-robert'],
  },
  'demo-caretaker': {
    uid: 'demo-caretaker-sarah',
    email: 'sarah.jenkins@caresync.health',
    displayName: 'Sarah Jenkins (Nurse & Caregiver)',
    role: USER_ROLES.CARETAKER,
    assignedProfiles: ['demo-profile-robert'],
  },
  'demo-family': {
    uid: 'demo-family-michael',
    email: 'michael.harrison@caresync.health',
    displayName: 'Michael Harrison (Son)',
    role: USER_ROLES.FAMILY,
    assignedProfiles: ['demo-profile-robert'],
  },
};

/**
 * CareSync Authentication Middleware
 * Validates Firebase ID tokens or handles demo tokens for evaluation
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication token is missing. Please provide a Bearer token.',
        code: 'AUTH_TOKEN_MISSING',
      });
    }

    const token = authHeader.split('Bearer ')[1].trim();

    // 1. Handle Demo / Evaluation tokens
    if (token.startsWith('demo-token-')) {
      const demoRole = token.replace('demo-token-', '');
      const demoUserKey = `demo-${demoRole}`;
      if (DEMO_USERS[demoUserKey]) {
        req.user = DEMO_USERS[demoUserKey];
        return next();
      }
    }

    // 2. Live Firebase Token Verification
    if (auth && typeof auth.verifyIdToken === 'function') {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          displayName: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
          role: decodedToken.role || USER_ROLES.ELDERLY, // Default or custom claim
        };
        return next();
      } catch (tokenErr) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired authentication token. Please sign in again.',
          code: 'AUTH_TOKEN_INVALID',
        });
      }
    }

    // 3. Fallback demo user if no admin auth is configured
    req.user = DEMO_USERS['demo-caretaker'];
    return next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to authenticate user: ' + err.message,
      code: 'AUTH_ERROR',
    });
  }
}

export default authenticate;
