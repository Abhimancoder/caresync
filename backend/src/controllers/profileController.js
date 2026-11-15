import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebaseAdmin.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, USER_ROLES } from '../config/constants.js';
import { memoryInvitations } from './invitationController.js';

/**
 * Immutable Server-Side Demo Registry.
 * Fixed in memory and protected against client tampering.
 */
export const TRUSTED_SERVER_SEEDS = Object.freeze({
  'demo-profile-robert': Object.freeze({
    elderlyUserId: 'demo-elderly-robert',
    authorizedCaretakers: Object.freeze(['demo-caretaker-sarah']),
    authorizedFamily: Object.freeze(['demo-family-michael']),
  }),
});

// In-memory profiles fallback for demo & evaluation
export const memoryProfiles = [
  {
    id: 'demo-profile-robert',
    elderlyUserId: 'demo-elderly-robert',
    fullName: 'Robert Harrison',
    age: 78,
    dateOfBirth: '1948-06-12',
    bloodGroup: 'O+',
    allergies: ['Penicillin', 'Sulfa drugs'],
    emergencyContacts: [
      {
        name: 'Sarah Jenkins',
        relationship: 'Daughter / Nurse & Primary Caregiver',
        phone: '+1-555-0199',
        isPrimary: true,
      },
      {
        name: 'Michael Harrison',
        relationship: 'Son',
        phone: '+1-555-0144',
        isPrimary: false,
      },
    ],
    authorizedMembers: [
      {
        userId: 'demo-caretaker-sarah',
        name: 'Sarah Jenkins',
        role: USER_ROLES.CARETAKER,
        joinedAt: '2026-11-15T08:00:00Z',
      },
      {
        userId: 'demo-family-michael',
        name: 'Michael Harrison',
        role: USER_ROLES.FAMILY,
        joinedAt: '2026-11-15T09:00:00Z',
      },
    ],
    authorizedUserIds: ['demo-caretaker-sarah', 'demo-family-michael', 'demo-elderly-robert'],
    authorizedCaretakerIds: ['demo-caretaker-sarah'],
    authorizedFamilyIds: ['demo-family-michael'],
    revokedUserIds: [],
    medicalNotes: 'Diagnosed with mild hypertension and type 2 diabetes. Manages daily regimen with caregiver assistance.',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-15T08:00:00Z',
  },
];

/**
 * Shared Trusted Membership Provenance Verifier.
 * Validates complete invitation lifecycle and server-side records.
 * Used for both Caretaker and Family roles.
 * Validates:
 * - Invitation exists in trusted database.
 * - Belongs to target profileId.
 * - Grants the expected role (caretaker or family).
 * - Redeemed by this exact member userId.
 * - Redemption timestamp is recorded.
 */
export async function validateTrustedMembershipProvenance(
  profileId,
  userId,
  memberRecord = {},
  expectedRole = null,
  dbInstance = db,
  transaction = null
) {
  if (!userId || !profileId) return false;

  // 1. Immutable Server-Seeded Demo Profile Registry
  const serverSeed = TRUSTED_SERVER_SEEDS[profileId];
  if (serverSeed) {
    if (expectedRole === USER_ROLES.CARETAKER && serverSeed.authorizedCaretakers.includes(userId)) {
      return true;
    }
    if (expectedRole === USER_ROLES.FAMILY && serverSeed.authorizedFamily?.includes(userId)) {
      return true;
    }
    if (!expectedRole && (serverSeed.authorizedCaretakers.includes(userId) || serverSeed.authorizedFamily?.includes(userId))) {
      return true;
    }
  }

  // 2. Validate against trusted server-side invitations database
  const inviteId = memberRecord?.verifiedInviteId;
  if (inviteId && typeof inviteId === 'string') {
    if (dbInstance && typeof dbInstance.collection === 'function') {
      try {
        const inviteRef = dbInstance.collection('invitations').doc(inviteId);
        const inviteDoc = transaction
          ? await transaction.get(inviteRef)
          : await inviteRef.get();

        if (inviteDoc && inviteDoc.exists) {
          const inv = inviteDoc.data();
          const matchesProfile = inv.profileId === profileId;
          const matchesRole = expectedRole ? inv.role === expectedRole : (inv.role === USER_ROLES.CARETAKER || inv.role === USER_ROLES.FAMILY);
          const wasRedeemedByUser = inv.lastRedeemedByUserId === userId ||
            (Array.isArray(inv.redeemedUserIds) && inv.redeemedUserIds.includes(userId));
          const hasRedemptionTimestamp = Boolean(inv.lastRedeemedAt);

          if (matchesProfile && matchesRole && wasRedeemedByUser && hasRedemptionTimestamp) {
            return true;
          }
        }
      } catch (err) {
        console.warn(`[Verification] Invitation lookup failed for ${inviteId}:`, err.message);
      }
    }

    // Check memoryInvitations store fallback
    const inv = memoryInvitations.find(i => i.id === inviteId);
    if (inv) {
      const matchesProfile = inv.profileId === profileId;
      const matchesRole = expectedRole ? inv.role === expectedRole : (inv.role === USER_ROLES.CARETAKER || inv.role === USER_ROLES.FAMILY);
      const wasRedeemedByUser = inv.lastRedeemedByUserId === userId ||
        (Array.isArray(inv.redeemedUserIds) && inv.redeemedUserIds.includes(userId));
      const hasRedemptionTimestamp = Boolean(inv.lastRedeemedAt);

      if (matchesProfile && matchesRole && wasRedeemedByUser && hasRedemptionTimestamp) {
        return true;
      }
    }
  }

  // 3. Fallback query: Has this user legitimately redeemed ANY valid server invitation for this profile and role?
  if (dbInstance && typeof dbInstance.collection === 'function' && !transaction) {
    try {
      let query = dbInstance.collection('invitations')
        .where('profileId', '==', profileId)
        .where('redeemedUserIds', 'array-contains', userId);
      if (expectedRole) {
        query = query.where('role', '==', expectedRole);
      }
      const snap = await query.limit(1).get();
      if (!snap.empty) {
        const inv = snap.docs[0].data();
        if (inv.lastRedeemedAt) {
          return true;
        }
      }
    } catch (e) {
      // unindexed fallback
    }
  } else {
    const memMatch = memoryInvitations.find(i =>
      i.profileId === profileId &&
      (!expectedRole || i.role === expectedRole) &&
      Array.isArray(i.redeemedUserIds) &&
      i.redeemedUserIds.includes(userId) &&
      Boolean(i.lastRedeemedAt)
    );
    if (memMatch) return true;
  }

  return false;
}

export async function isVerifiedCaretakerRecord(member, profile = {}, dbInstance = db, transaction = null) {
  return validateTrustedMembershipProvenance(
    profile.id,
    member?.userId,
    member,
    USER_ROLES.CARETAKER,
    dbInstance,
    transaction
  );
}

export async function isVerifiedFamilyRecord(member, profile = {}, dbInstance = db, transaction = null) {
  return validateTrustedMembershipProvenance(
    profile.id,
    member?.userId,
    member,
    USER_ROLES.FAMILY,
    dbInstance,
    transaction
  );
}

/**
 * Derives sanitized authorization state strictly from a given profile document.
 * Validates caretaker and family membership against server-side provenance.
 * GUARANTEE: Unverified candidates receive NEITHER caretaker nor general member read access!
 */
export async function deriveSanitizedProfileAuthorization(rawProfile, dbInstance = db, transaction = null) {
  if (!rawProfile || typeof rawProfile !== 'object') return rawProfile;

  const profileId = rawProfile.id;
  const revokedSet = new Set(Array.isArray(rawProfile.revokedUserIds) ? rawProfile.revokedUserIds : []);
  const rawMembers = Array.isArray(rawProfile.authorizedMembers) ? rawProfile.authorizedMembers : [];

  // Exclude revoked members immediately
  const nonRevokedMembers = rawMembers.filter(m => m && m.userId && !revokedSet.has(m.userId));

  const caretakerIdsSet = new Set();
  const familyIdsSet = new Set();
  const verifiedMembersList = [];

  // 1. Verify every candidate in authorizedMembers
  for (const m of nonRevokedMembers) {
    if (!m || !m.userId) continue;

    if (m.role === USER_ROLES.CARETAKER) {
      const isVerifiedCaretaker = await isVerifiedCaretakerRecord(m, rawProfile, dbInstance, transaction);
      if (isVerifiedCaretaker) {
        caretakerIdsSet.add(m.userId);
        verifiedMembersList.push(m);
      } else {
        console.warn(`[Security Alert] Stripped unverified caretaker candidate (${m.userId}) from profile ${profileId}. Zero membership granted.`);
      }
    } else if (m.role === USER_ROLES.FAMILY) {
      const isVerifiedFamily = await isVerifiedFamilyRecord(m, rawProfile, dbInstance, transaction);
      if (isVerifiedFamily) {
        familyIdsSet.add(m.userId);
        verifiedMembersList.push(m);
      } else {
        console.warn(`[Security Alert] Stripped unverified family candidate (${m.userId}) from profile ${profileId}. Zero membership granted.`);
      }
    } else {
      console.warn(`[Security Alert] Unknown or unauthorized role (${m.role}) for ${m.userId} on profile ${profileId}. Stripped.`);
    }
  }

  // 2. Audit existing rawProfile.authorizedCaretakerIds
  if (Array.isArray(rawProfile.authorizedCaretakerIds)) {
    for (const cid of rawProfile.authorizedCaretakerIds) {
      if (!revokedSet.has(cid) && !familyIdsSet.has(cid) && !caretakerIdsSet.has(cid)) {
        const memberRec = nonRevokedMembers.find(m => m.userId === cid) || { userId: cid, role: USER_ROLES.CARETAKER };
        const isVerified = await isVerifiedCaretakerRecord(memberRec, rawProfile, dbInstance, transaction);
        if (isVerified) {
          caretakerIdsSet.add(cid);
          if (!verifiedMembersList.some(m => m.userId === cid)) {
            verifiedMembersList.push(memberRec);
          }
        } else {
          console.warn(`[Security Alert] Stripping unverified existing authorizedCaretakerId (${cid}) on profile ${profileId}.`);
        }
      }
    }
  }

  // 3. Audit existing rawProfile.authorizedFamilyIds
  if (Array.isArray(rawProfile.authorizedFamilyIds)) {
    for (const fid of rawProfile.authorizedFamilyIds) {
      if (!revokedSet.has(fid) && !caretakerIdsSet.has(fid) && !familyIdsSet.has(fid)) {
        const memberRec = nonRevokedMembers.find(m => m.userId === fid) || { userId: fid, role: USER_ROLES.FAMILY };
        const isVerified = await isVerifiedFamilyRecord(memberRec, rawProfile, dbInstance, transaction);
        if (isVerified) {
          familyIdsSet.add(fid);
          if (!verifiedMembersList.some(m => m.userId === fid)) {
            verifiedMembersList.push(memberRec);
          }
        } else {
          console.warn(`[Security Alert] Stripping unverified existing authorizedFamilyId (${fid}) on profile ${profileId}.`);
        }
      }
    }
  }

  // 4. Strict Family vs Caretaker Separation: Family members can NEVER be in caretakerIds
  for (const fid of familyIdsSet) {
    caretakerIdsSet.delete(fid);
  }

  // 5. Build authorizedUserIds:
  // ONLY verified caretakers, verified family, and legitimate elderly owner!
  // UNVERIFIED CANDIDATES NEVER RECEIVE MEMBERSHIP OR READ ACCESS!
  const userIdsSet = new Set();
  for (const cid of caretakerIdsSet) userIdsSet.add(cid);
  for (const fid of familyIdsSet) userIdsSet.add(fid);
  if (rawProfile.elderlyUserId && !revokedSet.has(rawProfile.elderlyUserId)) {
    userIdsSet.add(rawProfile.elderlyUserId);
  }

  // 6. Final purge of any revoked ID across all collections
  for (const rid of revokedSet) {
    userIdsSet.delete(rid);
    caretakerIdsSet.delete(rid);
    familyIdsSet.delete(rid);
  }

  return {
    ...rawProfile,
    authorizedMembers: verifiedMembersList,
    authorizedUserIds: Array.from(userIdsSet),
    authorizedCaretakerIds: Array.from(caretakerIdsSet),
    authorizedFamilyIds: Array.from(familyIdsSet),
    revokedUserIds: Array.from(revokedSet),
  };
}

/**
 * Synchronous profile authorization sanitizer for immediate in-memory and response filtering.
 * Enforces authoritative revocation, family separation, and rejects unverified candidates.
 */
export function ensureProfileRoleArrays(profile) {
  if (!profile || typeof profile !== 'object') return profile;

  const profileId = profile.id;
  const revokedSet = new Set(Array.isArray(profile.revokedUserIds) ? profile.revokedUserIds : []);
  const rawMembers = Array.isArray(profile.authorizedMembers) ? profile.authorizedMembers : [];

  const nonRevokedMembers = rawMembers.filter(m => m && m.userId && !revokedSet.has(m.userId));

  const caretakerIdsSet = new Set();
  const familyIdsSet = new Set();
  const verifiedMembersList = [];

  const serverSeed = TRUSTED_SERVER_SEEDS[profileId];

  for (const m of nonRevokedMembers) {
    if (!m || !m.userId) continue;

    if (m.role === USER_ROLES.CARETAKER) {
      const isSeed = serverSeed?.authorizedCaretakers.includes(m.userId);
      const isMemInv = m.verifiedInviteId && memoryInvitations.some(inv =>
        inv.id === m.verifiedInviteId &&
        inv.profileId === profileId &&
        inv.role === USER_ROLES.CARETAKER &&
        (inv.lastRedeemedByUserId === m.userId || (Array.isArray(inv.redeemedUserIds) && inv.redeemedUserIds.includes(m.userId))) &&
        Boolean(inv.lastRedeemedAt)
      );
      if (isSeed || isMemInv) {
        caretakerIdsSet.add(m.userId);
        verifiedMembersList.push(m);
      } else {
        console.warn(`[Security Audit] Stripping unverified caretaker candidate (${m.userId}) from profile ${profileId}. Zero membership.`);
      }
    } else if (m.role === USER_ROLES.FAMILY) {
      const isSeed = serverSeed?.authorizedFamily?.includes(m.userId);
      const isMemInv = m.verifiedInviteId && memoryInvitations.some(inv =>
        inv.id === m.verifiedInviteId &&
        inv.profileId === profileId &&
        inv.role === USER_ROLES.FAMILY &&
        (inv.lastRedeemedByUserId === m.userId || (Array.isArray(inv.redeemedUserIds) && inv.redeemedUserIds.includes(m.userId))) &&
        Boolean(inv.lastRedeemedAt)
      );
      if (isSeed || isMemInv) {
        familyIdsSet.add(m.userId);
        verifiedMembersList.push(m);
      } else {
        console.warn(`[Security Audit] Stripping unverified family candidate (${m.userId}) from profile ${profileId}. Zero membership.`);
      }
    }
  }

  // Audit existing arrays in memory
  if (Array.isArray(profile.authorizedCaretakerIds)) {
    for (const cid of profile.authorizedCaretakerIds) {
      if (!revokedSet.has(cid) && !familyIdsSet.has(cid) && !caretakerIdsSet.has(cid)) {
        const isSeed = serverSeed?.authorizedCaretakers.includes(cid);
        const isMemInv = memoryInvitations.some(inv =>
          inv.profileId === profileId &&
          inv.role === USER_ROLES.CARETAKER &&
          (inv.lastRedeemedByUserId === cid || (Array.isArray(inv.redeemedUserIds) && inv.redeemedUserIds.includes(cid))) &&
          Boolean(inv.lastRedeemedAt)
        );
        if (isSeed || isMemInv) {
          caretakerIdsSet.add(cid);
          if (!verifiedMembersList.some(m => m.userId === cid)) {
            verifiedMembersList.push({ userId: cid, role: USER_ROLES.CARETAKER });
          }
        }
      }
    }
  }

  if (Array.isArray(profile.authorizedFamilyIds)) {
    for (const fid of profile.authorizedFamilyIds) {
      if (!revokedSet.has(fid) && !caretakerIdsSet.has(fid) && !familyIdsSet.has(fid)) {
        const isSeed = serverSeed?.authorizedFamily?.includes(fid);
        const isMemInv = memoryInvitations.some(inv =>
          inv.profileId === profileId &&
          inv.role === USER_ROLES.FAMILY &&
          (inv.lastRedeemedByUserId === fid || (Array.isArray(inv.redeemedUserIds) && inv.redeemedUserIds.includes(fid))) &&
          Boolean(inv.lastRedeemedAt)
        );
        if (isSeed || isMemInv) {
          familyIdsSet.add(fid);
          if (!verifiedMembersList.some(m => m.userId === fid)) {
            verifiedMembersList.push({ userId: fid, role: USER_ROLES.FAMILY });
          }
        }
      }
    }
  }

  // Strict separation
  for (const fid of familyIdsSet) {
    caretakerIdsSet.delete(fid);
  }

  // User IDs ONLY contains verified caretakers, verified family, and legitimate elderly owner
  const userIdsSet = new Set();
  for (const cid of caretakerIdsSet) userIdsSet.add(cid);
  for (const fid of familyIdsSet) userIdsSet.add(fid);
  if (profile.elderlyUserId && !revokedSet.has(profile.elderlyUserId)) {
    userIdsSet.add(profile.elderlyUserId);
  }

  for (const rid of revokedSet) {
    userIdsSet.delete(rid);
    caretakerIdsSet.delete(rid);
    familyIdsSet.delete(rid);
  }

  profile.authorizedMembers = verifiedMembersList;
  profile.authorizedUserIds = Array.from(userIdsSet);
  profile.authorizedCaretakerIds = Array.from(caretakerIdsSet);
  profile.authorizedFamilyIds = Array.from(familyIdsSet);
  profile.revokedUserIds = Array.from(revokedSet);

  return profile;
}

/**
 * Comprehensive authorization consistency check.
 * Checks for missing arrays, lingering revoked IDs, or unverified members.
 */
export function needsProfileAuthorizationSanitization(profile) {
  if (!profile || typeof profile !== 'object') return false;

  // 1. Missing role arrays
  if (!Array.isArray(profile.authorizedCaretakerIds) ||
      !Array.isArray(profile.authorizedUserIds) ||
      !Array.isArray(profile.authorizedFamilyIds)) {
    return true;
  }

  // 2. Lingering revoked IDs in any authorized list
  const revokedSet = new Set(Array.isArray(profile.revokedUserIds) ? profile.revokedUserIds : []);
  if (revokedSet.size > 0) {
    if (profile.authorizedCaretakerIds.some(id => revokedSet.has(id))) return true;
    if (profile.authorizedUserIds.some(id => revokedSet.has(id))) return true;
    if (profile.authorizedFamilyIds.some(id => revokedSet.has(id))) return true;
    if (Array.isArray(profile.authorizedMembers) && profile.authorizedMembers.some(m => m && revokedSet.has(m.userId))) return true;
  }

  // 3. Family ID incorrectly placed in caretaker IDs
  const familySet = new Set(profile.authorizedFamilyIds);
  if (profile.authorizedCaretakerIds.some(id => familySet.has(id))) {
    return true;
  }

  // 4. Stale/revoked active members list discrepancy
  const activeMembers = (profile.authorizedMembers || []).filter(m => m && !revokedSet.has(m.userId));
  if (activeMembers.length !== (profile.authorizedMembers || []).length) {
    return true;
  }

  return false;
}

export const needsRoleArrayMigration = needsProfileAuthorizationSanitization;

/**
 * Persists migrated role arrays back to Firestore asynchronously and idempotently.
 * Concurrency-safe: uses runTransaction to read freshDoc and compute strictly from freshDoc.
 * Passes transaction to deriveSanitizedProfileAuthorization to ensure all reads are within the transaction.
 * Fails safely without non-transactional overwrite fallback.
 */
export async function persistProfileRoleArraysIfLegacy(docId, rawProfile, dbInstance = db) {
  if (!needsProfileAuthorizationSanitization(rawProfile)) return rawProfile;

  if (dbInstance && typeof dbInstance.collection === 'function' && !docId.startsWith('demo-')) {
    const profileRef = dbInstance.collection('elderlyProfiles').doc(docId);

    if (typeof dbInstance.runTransaction === 'function') {
      try {
        await dbInstance.runTransaction(async (transaction) => {
          // 1. Read fresh profile document INSIDE the transaction
          const freshDoc = await transaction.get(profileRef);
          if (!freshDoc.exists) return;
          const freshData = freshDoc.data();

          // 2. Check whether migration or sanitization is required on fresh document
          if (!needsProfileAuthorizationSanitization(freshData)) {
            return; // Concurrently updated or already clean, abort safely
          }

          // 3. Derive migration results strictly from that fresh document
          // 4. Validate caretaker and family membership using trusted server-side provenance
          // 5. Apply revocation exclusions
          // Pass transaction so any invitation lookups are executed within transaction context
          const sanitized = await deriveSanitizedProfileAuthorization(freshData, dbInstance, transaction);

          // 6. Write only the newly calculated values
          // 7. Ensure concurrent invitation acceptance or revocation cannot be overwritten
          transaction.update(profileRef, {
            authorizedUserIds: sanitized.authorizedUserIds,
            authorizedCaretakerIds: sanitized.authorizedCaretakerIds,
            authorizedFamilyIds: sanitized.authorizedFamilyIds,
            authorizedMembers: sanitized.authorizedMembers,
            revokedUserIds: sanitized.revokedUserIds,
            updatedAt: new Date().toISOString(),
          });
        });
      } catch (err) {
        console.warn(`[Migration] Transactional migration failed for profile ${docId}:`, err.message);
      }
    } else {
      console.warn(`[Migration] Atomic transaction required; skipping non-transactional fallback for profile ${docId}.`);
    }
  }

  return ensureProfileRoleArrays(rawProfile);
}

/**
 * GET /api/profiles
 * Lists profiles the requesting user has permission to view
 */
export async function getAuthorizedProfiles(req, res, next) {
  try {
    const userId = req.user?.uid;

    if (db && typeof db.collection === 'function' && !userId.startsWith('demo-')) {
      // Direct indexed query for owned elderly profiles to avoid full-collection scan
      const ownedSnap = await db.collection('elderlyProfiles')
        .where('elderlyUserId', '==', userId)
        .get();

      const userProfilesMap = new Map();
      ownedSnap.forEach(doc => {
        const raw = { id: doc.id, ...doc.data() };
        if (needsRoleArrayMigration(raw)) {
          persistProfileRoleArraysIfLegacy(doc.id, raw, db).catch(() => {});
        }
        userProfilesMap.set(doc.id, ensureProfileRoleArrays(raw));
      });

      // Check member affiliations using targeted query
      try {
        const memberSnap = await db.collection('elderlyProfiles')
          .where('authorizedUserIds', 'array-contains', userId)
          .get();
        memberSnap.forEach(doc => {
          const raw = { id: doc.id, ...doc.data() };
          if (needsRoleArrayMigration(raw)) {
            persistProfileRoleArraysIfLegacy(doc.id, raw, db).catch(() => {});
          }
          userProfilesMap.set(doc.id, ensureProfileRoleArrays(raw));
        });
      } catch (e) {
        // Fallback for in-memory or unindexed composite query
      }

      const userProfiles = Array.from(userProfilesMap.values());
      return res.json({ success: true, count: userProfiles.length, data: userProfiles });
    }

    // Demo / fallback
    const migrated = memoryProfiles.map(p => ensureProfileRoleArrays(p));
    res.json({
      success: true,
      count: migrated.length,
      data: migrated,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/profiles/:id
 * Retrieves full health profile for an elderly individual
 */
export async function getProfileById(req, res, next) {
  try {
    const { id } = req.params;
    const requesterId = req.user?.uid;

    if (db && typeof db.collection === 'function' && !id.startsWith('demo-')) {
      const doc = await db.collection('elderlyProfiles').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Elderly profile not found.' });
      }
      const rawData = { id: doc.id, ...doc.data() };
      if (needsRoleArrayMigration(doc.data())) {
        persistProfileRoleArraysIfLegacy(id, rawData, db).catch(() => {});
      }
      const sanitized = ensureProfileRoleArrays(rawData);
      if (requesterId && !sanitized.authorizedUserIds?.includes(requesterId) && sanitized.elderlyUserId !== requesterId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You are not an authorized member of this profile.',
          code: 'FORBIDDEN_PROFILE_ACCESS',
        });
      }
      return res.json({ success: true, data: sanitized });
    }

    const profile = memoryProfiles.find(p => p.id === id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Elderly profile not found.' });
    }

    const sanitized = ensureProfileRoleArrays(profile);
    if (requesterId && !sanitized.authorizedUserIds?.includes(requesterId) && sanitized.elderlyUserId !== requesterId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are not an authorized member of this profile.',
        code: 'FORBIDDEN_PROFILE_ACCESS',
      });
    }

    res.json({ success: true, data: sanitized });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profiles
 * Creates a new elderly healthcare profile
 */
export async function createProfile(req, res, next) {
  try {
    const {
      fullName,
      age,
      dateOfBirth,
      bloodGroup = 'Unknown',
      allergies = [],
      emergencyContacts = [],
      medicalNotes = '',
    } = req.body;

    if (!fullName) {
      return res.status(400).json({ success: false, error: 'Full name is required to create a healthcare profile.' });
    }

    const profileId = uuidv4();
    const userId = req.user?.uid || 'user';
    const userName = req.user?.displayName || 'User';
    const userRole = req.user?.role || USER_ROLES.CARETAKER;

    const newProfile = {
      id: profileId,
      elderlyUserId: userRole === USER_ROLES.ELDERLY ? userId : null,
      fullName: fullName.trim(),
      age: Number(age) || null,
      dateOfBirth: dateOfBirth || null,
      bloodGroup,
      allergies: Array.isArray(allergies) ? allergies : [allergies],
      emergencyContacts,
      authorizedMembers: [
        {
          userId,
          name: userName,
          role: userRole,
          joinedAt: new Date().toISOString(),
          ...(userRole === USER_ROLES.CARETAKER ? { verifiedBy: 'creator_initial' } : {}),
        },
      ],
      authorizedUserIds: [userId],
      authorizedCaretakerIds: userRole === USER_ROLES.CARETAKER ? [userId] : [],
      authorizedFamilyIds: userRole === USER_ROLES.FAMILY ? [userId] : [],
      revokedUserIds: [],
      medicalNotes: medicalNotes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db && typeof db.collection === 'function') {
      await db.collection('elderlyProfiles').doc(profileId).set(newProfile);
    } else {
      memoryProfiles.push(newProfile);
    }

    await logActivity({
      profileId,
      actorUserId: userId,
      actorName: userName,
      actorRole: userRole,
      action: AUDIT_ACTIONS.PROFILE_CREATED,
      entityType: 'profile',
      entityId: profileId,
      details: `Created new healthcare profile for ${fullName}.`,
    });

    res.status(201).json({
      success: true,
      message: 'Healthcare profile created successfully.',
      data: newProfile,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profiles/:id
 * Updates healthcare notes, emergency contacts, or allergies
 */
export async function updateProfile(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowed = ['fullName', 'age', 'bloodGroup', 'allergies', 'emergencyContacts', 'medicalNotes'];
    const cleanUpdates = { updatedAt: new Date().toISOString() };

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }

    if (db && typeof db.collection === 'function' && !id.startsWith('demo-')) {
      const ref = db.collection('elderlyProfiles').doc(id);
      const snap = await ref.get();
      if (!snap.exists) {
        return res.status(404).json({ success: false, error: 'Profile not found.' });
      }
      await ref.update(cleanUpdates);
    } else {
      const profile = memoryProfiles.find(p => p.id === id);
      if (!profile) {
        return res.status(404).json({ success: false, error: 'Profile not found.' });
      }
      Object.assign(profile, cleanUpdates);
    }

    await logActivity({
      profileId: id,
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.PROFILE_UPDATED,
      entityType: 'profile',
      entityId: id,
      details: `Updated healthcare profile details.`,
    });

    res.json({
      success: true,
      message: 'Healthcare profile updated successfully.',
      data: cleanUpdates,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/profiles/:id/members/:memberUserId
 * Revokes a member's access from an elderly profile
 */
export async function removeMember(req, res, next) {
  try {
    const { id, memberUserId } = req.params;

    if (db && typeof db.collection === 'function' && !id.startsWith('demo-')) {
      const ref = db.collection('elderlyProfiles').doc(id);
      if (typeof db.runTransaction === 'function') {
        await db.runTransaction(async (transaction) => {
          const snap = await transaction.get(ref);
          if (!snap.exists) return;
          const data = snap.data();
          const members = Array.isArray(data.authorizedMembers) ? data.authorizedMembers : [];
          const updated = members.filter(m => m.userId !== memberUserId);
          const updatedUserIds = (data.authorizedUserIds || []).filter(uid => uid !== memberUserId);
          const updatedCaretakerIds = (data.authorizedCaretakerIds || []).filter(uid => uid !== memberUserId);
          const updatedFamilyIds = (data.authorizedFamilyIds || []).filter(uid => uid !== memberUserId);
          const updatedRevokedIds = Array.from(new Set([...(data.revokedUserIds || []), memberUserId]));
          transaction.update(ref, {
            authorizedMembers: updated,
            authorizedUserIds: updatedUserIds,
            authorizedCaretakerIds: updatedCaretakerIds,
            authorizedFamilyIds: updatedFamilyIds,
            revokedUserIds: updatedRevokedIds,
            updatedAt: new Date().toISOString(),
          });
        });
      } else {
        const snap = await ref.get();
        if (snap.exists) {
          const data = snap.data();
          const members = Array.isArray(data.authorizedMembers) ? data.authorizedMembers : [];
          const updated = members.filter(m => m.userId !== memberUserId);
          const updatedUserIds = (data.authorizedUserIds || []).filter(uid => uid !== memberUserId);
          const updatedCaretakerIds = (data.authorizedCaretakerIds || []).filter(uid => uid !== memberUserId);
          const updatedFamilyIds = (data.authorizedFamilyIds || []).filter(uid => uid !== memberUserId);
          const updatedRevokedIds = Array.from(new Set([...(data.revokedUserIds || []), memberUserId]));
          await ref.update({
            authorizedMembers: updated,
            authorizedUserIds: updatedUserIds,
            authorizedCaretakerIds: updatedCaretakerIds,
            authorizedFamilyIds: updatedFamilyIds,
            revokedUserIds: updatedRevokedIds,
            updatedAt: new Date().toISOString(),
          });
        }
      }
    } else {
      const profile = memoryProfiles.find(p => p.id === id);
      if (profile) {
        profile.authorizedMembers = (profile.authorizedMembers || []).filter(m => m.userId !== memberUserId);
        if (profile.authorizedUserIds) {
          profile.authorizedUserIds = profile.authorizedUserIds.filter(uid => uid !== memberUserId);
        }
        if (profile.authorizedCaretakerIds) {
          profile.authorizedCaretakerIds = profile.authorizedCaretakerIds.filter(uid => uid !== memberUserId);
        }
        if (profile.authorizedFamilyIds) {
          profile.authorizedFamilyIds = profile.authorizedFamilyIds.filter(uid => uid !== memberUserId);
        }
        profile.revokedUserIds = Array.from(new Set([...(profile.revokedUserIds || []), memberUserId]));
      }
    }

    await logActivity({
      profileId: id,
      actorUserId: req.user?.uid || 'user',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'caretaker',
      action: AUDIT_ACTIONS.MEMBER_REMOVED,
      entityType: 'profile',
      entityId: id,
      details: `Revoked care team access for member (${memberUserId}).`,
    });

    res.json({ success: true, message: 'Member access revoked successfully.' });
  } catch (err) {
    next(err);
  }
}

export default {
  getAuthorizedProfiles,
  getProfileById,
  createProfile,
  updateProfile,
  removeMember,
};
