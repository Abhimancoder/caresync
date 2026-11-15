import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebaseAdmin.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, USER_ROLES } from '../config/constants.js';

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
    medicalNotes: 'Diagnosed with mild hypertension and type 2 diabetes. Manages daily regimen with caregiver assistance.',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-15T08:00:00Z',
  },
];

/**
 * GET /api/profiles
 * Lists profiles the requesting user has permission to view
 */
export async function getAuthorizedProfiles(req, res, next) {
  try {
    const userId = req.user?.uid;

    if (db && typeof db.collection === 'function' && !userId.startsWith('demo-')) {
      const snap = await db.collection('elderlyProfiles').get();
      const userProfiles = [];

      snap.forEach(doc => {
        const data = doc.data();
        const isOwner = data.elderlyUserId === userId;
        const isMember = Array.isArray(data.authorizedMembers) && data.authorizedMembers.some(m => m.userId === userId);
        if (isOwner || isMember) {
          userProfiles.push({ id: doc.id, ...data });
        }
      });

      return res.json({ success: true, count: userProfiles.length, data: userProfiles });
    }

    // Demo / fallback
    res.json({
      success: true,
      count: memoryProfiles.length,
      data: memoryProfiles,
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

    if (db && typeof db.collection === 'function' && !id.startsWith('demo-')) {
      const doc = await db.collection('elderlyProfiles').doc(id).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, error: 'Elderly profile not found.' });
      }
      return res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    }

    const profile = memoryProfiles.find(p => p.id === id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Elderly profile not found.' });
    }

    res.json({ success: true, data: profile });
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
        },
      ],
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
      const snap = await ref.get();
      if (snap.exists) {
        const members = snap.data().authorizedMembers || [];
        const updated = members.filter(m => m.userId !== memberUserId);
        await ref.update({ authorizedMembers: updated });
      }
    } else {
      const profile = memoryProfiles.find(p => p.id === id);
      if (profile) {
        profile.authorizedMembers = profile.authorizedMembers.filter(m => m.userId !== memberUserId);
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
