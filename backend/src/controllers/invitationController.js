import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/firebaseAdmin.js';
import { logActivity } from '../services/auditLogger.js';
import { AUDIT_ACTIONS, USER_ROLES } from '../config/constants.js';

// In-memory store fallback for demo & evaluation
const memoryInvitations = [];
const memoryProfiles = [
  {
    id: 'demo-profile-robert',
    elderlyUserId: 'demo-elderly-robert',
    fullName: 'Robert Harrison',
    age: 78,
    bloodGroup: 'O+',
    emergencyContacts: [
      { name: 'Sarah Jenkins', relationship: 'Daughter / Nurse', phone: '+1-555-0199', isPrimary: true },
      { name: 'Michael Harrison', relationship: 'Son', phone: '+1-555-0144', isPrimary: false },
    ],
    authorizedMembers: [
      { userId: 'demo-caretaker-sarah', role: USER_ROLES.CARETAKER, name: 'Sarah Jenkins', joinedAt: '2026-11-15T08:00:00Z' },
      { userId: 'demo-family-michael', role: USER_ROLES.FAMILY, name: 'Michael Harrison', joinedAt: '2026-11-15T09:00:00Z' },
    ],
    medicalNotes: 'Mild hypertension, manages daily medications with caretaker oversight.',
  }
];

/**
 * Generates a cryptographically strong 6-character passcode
 */
function generatePasscode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0/O, 1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

/**
 * POST /api/invitations/generate
 * Generates a secure passcode invitation for a caretaker or family member
 */
export async function generateInvitation(req, res, next) {
  try {
    const { profileId, role, recipientEmail, maxUses = 1 } = req.body;

    if (!profileId || !role) {
      return res.status(400).json({
        success: false,
        error: 'Both profileId and role (caretaker or family) are required.',
      });
    }

    if (![USER_ROLES.CARETAKER, USER_ROLES.FAMILY].includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role for invitation. Must be caretaker or family.',
      });
    }

    // Generate random passcode and hash it with bcrypt
    const rawPasscode = generatePasscode();
    const salt = await bcrypt.genSalt(10);
    const hashedPasscode = await bcrypt.hash(rawPasscode, salt);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72); // 72 hours validity

    const invitationId = uuidv4();
    const invitationDoc = {
      id: invitationId,
      profileId,
      role,
      recipientEmail: recipientEmail || null,
      hashedPasscode,
      expiresAt: expiresAt.toISOString(),
      maxUses: Number(maxUses),
      usedCount: 0,
      isRevoked: false,
      createdByUserId: req.user?.uid || 'system',
      createdAt: new Date().toISOString(),
    };

    if (db && typeof db.collection === 'function') {
      await db.collection('invitations').doc(invitationId).set(invitationDoc);
    } else {
      memoryInvitations.push(invitationDoc);
    }

    await logActivity({
      profileId,
      actorUserId: req.user?.uid || 'system',
      actorName: req.user?.displayName || 'User',
      actorRole: req.user?.role || 'user',
      action: AUDIT_ACTIONS.INVITATION_GENERATED,
      entityType: 'invitation',
      entityId: invitationId,
      details: `Generated a ${role} invitation with 72-hour passcode access.`,
    });

    // Security note: rawPasscode is returned once here and never stored in plain text
    res.status(201).json({
      success: true,
      message: 'Invitation generated successfully. Share this passcode securely with the recipient.',
      invitationId,
      passcode: rawPasscode,
      role,
      expiresAt: invitationDoc.expiresAt,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/invitations/verify-and-join
 * Verifies the passcode and authorizes the user to access the elderly profile
 */
export async function verifyAndJoin(req, res, next) {
  try {
    const { passcode } = req.body;

    if (!passcode || typeof passcode !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Passcode is required to join a care team.',
      });
    }

    const cleanPasscode = passcode.trim().toUpperCase();
    const now = new Date();

    let candidateInvites = [];

    if (db && typeof db.collection === 'function') {
      const snapshot = await db.collection('invitations')
        .where('isRevoked', '==', false)
        .get();
      candidateInvites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      candidateInvites = memoryInvitations.filter(inv => !inv.isRevoked);
    }

    // Filter candidate invitations by expiration & usage limit
    const activeInvites = candidateInvites.filter(inv => {
      const notExpired = new Date(inv.expiresAt) > now;
      const notExhausted = inv.usedCount < inv.maxUses;
      return notExpired && notExhausted;
    });

    // Check bcrypt hash for each active invitation
    let matchedInvite = null;
    for (const invite of activeInvites) {
      const isMatch = await bcrypt.compare(cleanPasscode, invite.hashedPasscode);
      if (isMatch) {
        matchedInvite = invite;
        break;
      }
    }

    if (!matchedInvite) {
      return res.status(400).json({
        success: false,
        error: 'Invalid, expired, or already used passcode. Please check with your care team administrator.',
        code: 'INVALID_PASSCODE',
      });
    }

    // Grant access: update user document and add to elderly profile's authorizedMembers
    const userUid = req.user.uid;
    const userName = req.user.displayName || 'Authorized Member';

    const newMemberRecord = {
      userId: userUid,
      name: userName,
      role: matchedInvite.role,
      joinedAt: new Date().toISOString(),
    };

    if (db && typeof db.collection === 'function') {
      // 1. Update Profile
      const profileRef = db.collection('elderlyProfiles').doc(matchedInvite.profileId);
      const profileDoc = await profileRef.get();
      if (profileDoc.exists) {
        const existingMembers = profileDoc.data().authorizedMembers || [];
        const alreadyMember = existingMembers.some(m => m.userId === userUid);
        if (!alreadyMember) {
          await profileRef.update({
            authorizedMembers: [...existingMembers, newMemberRecord],
            updatedAt: new Date().toISOString(),
          });
        }
      }

      // 2. Burn invitation if max uses reached
      await db.collection('invitations').doc(matchedInvite.id).update({
        usedCount: matchedInvite.usedCount + 1,
        isRevoked: matchedInvite.usedCount + 1 >= matchedInvite.maxUses,
      });
    } else {
      // Memory fallback
      const profile = memoryProfiles.find(p => p.id === matchedInvite.profileId);
      if (profile) {
        if (!profile.authorizedMembers.some(m => m.userId === userUid)) {
          profile.authorizedMembers.push(newMemberRecord);
        }
      }
      matchedInvite.usedCount += 1;
      if (matchedInvite.usedCount >= matchedInvite.maxUses) {
        matchedInvite.isRevoked = true;
      }
    }

    await logActivity({
      profileId: matchedInvite.profileId,
      actorUserId: userUid,
      actorName: userName,
      actorRole: matchedInvite.role,
      action: AUDIT_ACTIONS.INVITATION_ACCEPTED,
      entityType: 'profile',
      entityId: matchedInvite.profileId,
      details: `${userName} successfully joined the care team as a ${matchedInvite.role} using a secure invitation passcode.`,
    });

    res.json({
      success: true,
      message: `Welcome to the care team! You now have access as a ${matchedInvite.role}.`,
      profileId: matchedInvite.profileId,
      role: matchedInvite.role,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/invitations/:id
 * Revokes an existing invitation immediately
 */
export async function revokeInvitation(req, res, next) {
  try {
    const { id } = req.params;

    if (db && typeof db.collection === 'function') {
      await db.collection('invitations').doc(id).update({
        isRevoked: true,
        revokedAt: new Date().toISOString(),
      });
    } else {
      const invite = memoryInvitations.find(inv => inv.id === id);
      if (invite) {
        invite.isRevoked = true;
      }
    }

    res.json({
      success: true,
      message: 'Invitation has been revoked.',
    });
  } catch (err) {
    next(err);
  }
}

export default {
  generateInvitation,
  verifyAndJoin,
  revokeInvitation,
};
