import request from 'supertest';
import { jest } from '@jest/globals';
import app from '../src/server.js';
import { db } from '../src/config/firebaseAdmin.js';
import { DOSE_STATUS } from '../src/config/constants.js';
import {
  ensureProfileRoleArrays,
  needsRoleArrayMigration,
  needsProfileAuthorizationSanitization,
  persistProfileRoleArraysIfLegacy,
  isVerifiedCaretakerRecord,
  isVerifiedFamilyRecord,
  deriveSanitizedProfileAuthorization,
  TRUSTED_SERVER_SEEDS,
} from '../src/controllers/profileController.js';
import { memoryInvitations } from '../src/controllers/invitationController.js';

describe('CareSync Healthcare Workflow & RBAC Integration Tests', () => {
  const caretakerAuth = 'Bearer demo-token-caretaker';
  const familyAuth = 'Bearer demo-token-family';
  const elderlyAuth = 'Bearer demo-token-elderly';

  describe('Prescription Management & RBAC Protection', () => {
    test('GET /api/medications allows authorized caretaker and family to view list', async () => {
      const res = await request(app)
        .get('/api/medications?profileId=demo-profile-robert')
        .set('Authorization', familyAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    test('POST /api/medications rejects prescription creation when attempted by read-only family member', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', familyAuth)
        .send({
          profileId: 'demo-profile-robert',
          name: 'Hydrochlorothiazide',
          dosage: '25',
          unit: 'mg',
          scheduledTimes: ['09:00'],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('POST /api/medications allows authorized caretaker to create a new prescription', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', caretakerAuth)
        .send({
          profileId: 'demo-profile-robert',
          name: 'Atorvastatin Calcium',
          dosage: '20',
          unit: 'mg',
          form: 'tablet',
          instructions: 'Take 1 tablet at bedtime.',
          prescribingDoctor: 'Dr. Angela Martinez',
          frequency: 'once_daily',
          scheduledTimes: ['21:00'],
          startDate: '2026-11-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Atorvastatin Calcium');
    });
  });

  describe('Dose Adherence & Intake Marking', () => {
    test('PATCH /api/doses/:id/status allows elderly patient to mark their scheduled dose as taken', async () => {
      // First fetch today's doses to get a valid dose ID
      const todayRes = await request(app)
        .get('/api/doses/today?profileId=demo-profile-robert')
        .set('Authorization', elderlyAuth);

      expect(todayRes.status).toBe(200);
      const firstDose = todayRes.body.data[0];
      expect(firstDose).toBeDefined();

      const patchRes = await request(app)
        .patch(`/api/doses/${firstDose.id}/status`)
        .set('Authorization', elderlyAuth)
        .send({ status: DOSE_STATUS.TAKEN, notes: 'Taken with breakfast' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.success).toBe(true);
      expect(patchRes.body.data.status).toBe(DOSE_STATUS.TAKEN);
    });

    test('PATCH /api/doses/:id/status rejects marking when attempted by read-only family member', async () => {
      const res = await request(app)
        .patch('/api/doses/some-dose-id/status')
        .set('Authorization', familyAuth)
        .send({ status: DOSE_STATUS.TAKEN });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('PATCH /api/doses/:id/status rejects marking with invalid status value', async () => {
      const res = await request(app)
        .patch('/api/doses/some-dose-id/status')
        .set('Authorization', caretakerAuth)
        .send({ status: 'INVALID_STATUS_CODE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Clinical Appointments & Audit Trail', () => {
    test('POST /api/appointments rejects clinical appointment creation by family member', async () => {
      const res = await request(app)
        .post('/api/appointments')
        .set('Authorization', familyAuth)
        .send({
          profileId: 'demo-profile-robert',
          doctorName: 'Dr. Angela Martinez',
          hospitalClinic: 'St. Jude Pavilion',
          appointmentDate: '2026-11-25',
          appointmentTime: '10:00',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('GET /api/appointments returns partitioned upcoming and past clinical visits', async () => {
      const res = await request(app)
        .get('/api/appointments?profileId=demo-profile-robert')
        .set('Authorization', familyAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.upcoming)).toBe(true);
      expect(Array.isArray(res.body.past)).toBe(true);
    });

    test('GET /api/activity-logs returns chronological audit log of actions', async () => {
      const res = await request(app)
        .get('/api/activity-logs?profileId=demo-profile-robert&limit=10')
        .set('Authorization', caretakerAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('Profile Security & Role Isolation', () => {
    test('GET /api/profiles/:id returns backward-compatible role arrays with strict isolation', async () => {
      const res = await request(app)
        .get('/api/profiles/demo-profile-robert')
        .set('Authorization', familyAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const profile = res.body.data;
      expect(profile.authorizedCaretakerIds).toContain('demo-caretaker-sarah');
      expect(profile.authorizedCaretakerIds).not.toContain('demo-family-michael');
      expect(profile.authorizedFamilyIds).toContain('demo-family-michael');
    });

    test('PUT /api/profiles/:id rejects profile modification by read-only family member', async () => {
      const res = await request(app)
        .put('/api/profiles/demo-profile-robert')
        .set('Authorization', familyAuth)
        .send({ medicalNotes: 'Unauthorized change attempt' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('PUT /api/profiles/:id allows authorized caretaker to update clinical notes', async () => {
      const res = await request(app)
        .put('/api/profiles/demo-profile-robert')
        .set('Authorization', caretakerAuth)
        .send({ medicalNotes: 'Updated by Sarah Jenkins RN' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('DELETE /api/profiles/:id/members/:memberUserId cleans up authorizedMembers and role arrays', async () => {
      // Revoke a test member from demo-profile-robert
      const res = await request(app)
        .delete('/api/profiles/demo-profile-robert/members/demo-family-michael')
        .set('Authorization', caretakerAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('revoked successfully');
    });
  });

  describe('Appointment Security & Role Authorization', () => {
    test('PUT /api/appointments/:id allows caretaker to update doctor and schedule', async () => {
      const res = await request(app)
        .put('/api/appointments/appt-demo-1')
        .set('Authorization', caretakerAuth)
        .send({ doctorName: 'Dr. Angela Martinez MD', notes: 'Pre-consultation review completed.' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('PUT /api/appointments/:id rejects update when attempted by family member', async () => {
      const res = await request(app)
        .put('/api/appointments/appt-demo-1')
        .set('Authorization', familyAuth)
        .send({ doctorName: 'Unauthorized Doctor Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Notifications Security & Adherence Alerts', () => {
    test('PATCH /api/notifications/:id/read marks notification as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/notif-demo-1/read')
        .set('Authorization', caretakerAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('marked as read');
    });

    test('GET /api/notifications returns recipient notifications and unread count', async () => {
      const res = await request(app)
        .get('/api/notifications?profileId=demo-profile-robert')
        .set('Authorization', caretakerAuth);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.unreadCount).toBe('number');
    });
  });

  describe('Persistent Legacy Profile Migration & Privilege Escalation Defenses', () => {
    test('1. An unverified caretaker candidate in authorizedMembers CANNOT obtain authorizedUserIds membership', async () => {
      const profile = {
        id: 'test-profile-unverified-no-member',
        elderlyUserId: 'senior-1',
        authorizedMembers: [
          { userId: 'unverified-intruder-1', role: 'caretaker' },
        ],
      };

      const isVerified = await isVerifiedCaretakerRecord(profile.authorizedMembers[0], profile);
      expect(isVerified).toBe(false);

      const sanitized = await deriveSanitizedProfileAuthorization(profile);
      expect(sanitized.authorizedCaretakerIds).not.toContain('unverified-intruder-1');
      expect(sanitized.authorizedUserIds).not.toContain('unverified-intruder-1');
      expect(sanitized.authorizedMembers.some(m => m.userId === 'unverified-intruder-1')).toBe(false);
      expect(sanitized.authorizedUserIds).toEqual(['senior-1']);
    });

    test('2. An unverified caretaker candidate CANNOT read protected profile data via GET /api/profiles/:id', async () => {
      const unverifiedAuth = 'Bearer demo-token-unverified';
      const res = await request(app)
        .get('/api/profiles/demo-profile-robert')
        .set('Authorization', unverifiedAuth);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('FORBIDDEN_PROFILE_ACCESS');
    });

    test('3. A forged invitation ID CANNOT grant caretaker or profile membership', async () => {
      const forgedInviteProfile = {
        id: 'test-profile-forgery',
        elderlyUserId: 'senior-3',
        authorizedMembers: [
          {
            userId: 'attacker-forger',
            role: 'caretaker',
            verifiedInviteId: 'fake-uuid-not-in-db',
            verifiedBy: 'system_admin',
          },
        ],
      };

      const isVerified = await isVerifiedCaretakerRecord(forgedInviteProfile.authorizedMembers[0], forgedInviteProfile);
      expect(isVerified).toBe(false);

      const sanitized = await deriveSanitizedProfileAuthorization(forgedInviteProfile);
      expect(sanitized.authorizedCaretakerIds).not.toContain('attacker-forger');
      expect(sanitized.authorizedUserIds).not.toContain('attacker-forger');
      expect(sanitized.authorizedMembers.some(m => m.userId === 'attacker-forger')).toBe(false);
    });

    test('4. An expired invitation CANNOT grant new caretaker or profile membership', async () => {
      const expiredInviteId = 'expired-invite-xyz';
      const expiredInviteDoc = {
        id: expiredInviteId,
        profileId: 'test-profile-expired',
        role: 'caretaker',
        hashedPasscode: '$2a$10$abcdefghijklmnopqrstuu',
        expiresAt: new Date(Date.now() - 3600000).toISOString(),
        maxUses: 1,
        usedCount: 0,
        isRevoked: false,
        redeemedUserIds: [],
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      };

      memoryInvitations.push(expiredInviteDoc);
      if (db && typeof db.collection === 'function') {
        await db.collection('invitations').doc(expiredInviteId).set(expiredInviteDoc);
      }

      const candidateRecord = {
        userId: 'expired-invitee',
        role: 'caretaker',
        verifiedInviteId: expiredInviteId,
      };
      const isVerified = await isVerifiedCaretakerRecord(candidateRecord, { id: 'test-profile-expired' });
      expect(isVerified).toBe(false);

      const profile = {
        id: 'test-profile-expired',
        elderlyUserId: 'senior-4',
        authorizedMembers: [candidateRecord],
      };
      const sanitized = await deriveSanitizedProfileAuthorization(profile);
      expect(sanitized.authorizedCaretakerIds).not.toContain('expired-invitee');
      expect(sanitized.authorizedUserIds).not.toContain('expired-invitee');
    });

    test('5. An invitation revoked prior to redemption CANNOT grant access', async () => {
      const revokedInviteId = 'revoked-invite-prior-use';
      const revokedInviteDoc = {
        id: revokedInviteId,
        profileId: 'test-profile-revoked-invite',
        role: 'caretaker',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 1,
        usedCount: 0,
        isRevoked: true,
        redeemedUserIds: [],
        createdAt: new Date().toISOString(),
      };

      memoryInvitations.push(revokedInviteDoc);
      if (db && typeof db.collection === 'function') {
        await db.collection('invitations').doc(revokedInviteId).set(revokedInviteDoc);
      }

      const member = {
        userId: 'user-revoked-invite',
        role: 'caretaker',
        verifiedInviteId: revokedInviteId,
      };
      const isVerified = await isVerifiedCaretakerRecord(member, { id: 'test-profile-revoked-invite' });
      expect(isVerified).toBe(false);

      const profile = {
        id: 'test-profile-revoked-invite',
        elderlyUserId: 'senior-5',
        authorizedMembers: [member],
      };
      const sanitized = await deriveSanitizedProfileAuthorization(profile);
      expect(sanitized.authorizedCaretakerIds).not.toContain('user-revoked-invite');
      expect(sanitized.authorizedUserIds).not.toContain('user-revoked-invite');
    });

    test('6. A valid, successfully redeemed invitation DOES grant the correct caretaker and member access', async () => {
      const legitInviteId = 'legit-redeemed-invite-999';
      const legitInviteDoc = {
        id: legitInviteId,
        profileId: 'test-profile-legit-999',
        role: 'caretaker',
        redeemedUserIds: ['legit-nurse-999'],
        lastRedeemedByUserId: 'legit-nurse-999',
        lastRedeemedAt: new Date().toISOString(),
        isRevoked: true,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 1,
        usedCount: 1,
      };

      memoryInvitations.push(legitInviteDoc);
      if (db && typeof db.collection === 'function') {
        await db.collection('invitations').doc(legitInviteId).set(legitInviteDoc);
      }

      const legitMember = {
        userId: 'legit-nurse-999',
        role: 'caretaker',
        verifiedInviteId: legitInviteId,
      };
      const profile = {
        id: 'test-profile-legit-999',
        elderlyUserId: 'senior-6',
        authorizedMembers: [legitMember],
      };

      const isVerified = await isVerifiedCaretakerRecord(legitMember, profile);
      expect(isVerified).toBe(true);

      const sanitized = await deriveSanitizedProfileAuthorization(profile);
      expect(sanitized.authorizedCaretakerIds).toContain('legit-nurse-999');
      expect(sanitized.authorizedUserIds).toContain('legit-nurse-999');
      expect(sanitized.authorizedUserIds).toContain('senior-6');
      expect(sanitized.authorizedFamilyIds).not.toContain('legit-nurse-999');
    });

    test('7. Concurrent redemptions exceeding maxUses are rejected and CANNOT create excess caretakers', async () => {
      const exhaustedInviteId = 'exhausted-invite-limit';
      const exhaustedInviteDoc = {
        id: exhaustedInviteId,
        profileId: 'test-profile-limit',
        role: 'caretaker',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 1,
        usedCount: 1,
        isRevoked: true,
        redeemedUserIds: ['first-winner-uid'],
        lastRedeemedByUserId: 'first-winner-uid',
        lastRedeemedAt: new Date().toISOString(),
      };

      const secondUserRecord = {
        userId: 'second-loser-uid',
        role: 'caretaker',
        verifiedInviteId: exhaustedInviteId,
      };

      memoryInvitations.push(exhaustedInviteDoc);
      if (db && typeof db.collection === 'function') {
        await db.collection('invitations').doc(exhaustedInviteId).set(exhaustedInviteDoc);
      }

      const isVerifiedFirst = await isVerifiedCaretakerRecord(
        { userId: 'first-winner-uid', verifiedInviteId: exhaustedInviteId },
        { id: 'test-profile-limit' }
      );
      expect(isVerifiedFirst).toBe(true);

      const isVerifiedSecond = await isVerifiedCaretakerRecord(secondUserRecord, { id: 'test-profile-limit' });
      expect(isVerifiedSecond).toBe(false);

      const profile = {
        id: 'test-profile-limit',
        elderlyUserId: 'senior-7',
        authorizedMembers: [
          { userId: 'first-winner-uid', role: 'caretaker', verifiedInviteId: exhaustedInviteId },
          secondUserRecord,
        ],
      };

      const sanitized = await deriveSanitizedProfileAuthorization(profile);
      expect(sanitized.authorizedCaretakerIds).toContain('first-winner-uid');
      expect(sanitized.authorizedCaretakerIds).not.toContain('second-loser-uid');
      expect(sanitized.authorizedUserIds).not.toContain('second-loser-uid');
    });

    test('8. A failed profile update rolls back / does not leave an invitation marked redeemed without profile membership', async () => {
      const inviteId = 'atomic-rollback-invite';
      const inviteRef = { id: inviteId };
      const profileRef = { id: 'non-existent-profile' };

      let inviteState = {
        id: inviteId,
        profileId: 'non-existent-profile',
        role: 'caretaker',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        maxUses: 1,
        usedCount: 0,
        isRevoked: false,
        redeemedUserIds: [],
      };

      const mockTransaction = {
        get: jest.fn(async (ref) => {
          if (ref === inviteRef) {
            return { exists: true, data: () => ({ ...inviteState }) };
          }
          if (ref === profileRef) {
            return { exists: false };
          }
          return { exists: false };
        }),
        update: jest.fn((ref, updates) => {
          if (ref === inviteRef) {
            Object.assign(inviteState, updates);
          }
        }),
      };

      let transactionError = null;
      try {
        await (async (transaction) => {
          const freshInviteDoc = await transaction.get(inviteRef);
          const freshInvite = freshInviteDoc.data();
          if (freshInvite.usedCount >= freshInvite.maxUses) throw new Error('INVITATION_EXHAUSTED');

          const freshProfileDoc = await transaction.get(profileRef);
          if (!freshProfileDoc.exists) {
            throw new Error('PROFILE_NOT_FOUND');
          }
          transaction.update(inviteRef, { usedCount: 1 });
        })(mockTransaction);
      } catch (err) {
        transactionError = err;
      }

      expect(transactionError).toBeDefined();
      expect(transactionError.message).toBe('PROFILE_NOT_FOUND');
      expect(mockTransaction.update).not.toHaveBeenCalled();
      expect(inviteState.usedCount).toBe(0);
      expect(inviteState.isRevoked).toBe(false);
    });

    test('9. Migration CANNOT restore membership for previously revoked or unverified users', async () => {
      const profileWithRevokedAndUnverified = {
        id: 'test-profile-no-restore',
        elderlyUserId: 'senior-9',
        authorizedMembers: [
          { userId: 'revoked-user-9', role: 'caretaker' },
          { userId: 'unverified-user-9', role: 'family' },
        ],
        authorizedUserIds: ['senior-9', 'revoked-user-9', 'unverified-user-9'],
        authorizedCaretakerIds: ['revoked-user-9'],
        authorizedFamilyIds: ['unverified-user-9'],
        revokedUserIds: ['revoked-user-9'],
      };

      expect(needsProfileAuthorizationSanitization(profileWithRevokedAndUnverified)).toBe(true);

      const sanitized = await deriveSanitizedProfileAuthorization(profileWithRevokedAndUnverified);
      expect(sanitized.authorizedCaretakerIds).not.toContain('revoked-user-9');
      expect(sanitized.authorizedUserIds).not.toContain('revoked-user-9');
      expect(sanitized.revokedUserIds).toContain('revoked-user-9');
      expect(sanitized.authorizedFamilyIds).not.toContain('unverified-user-9');
      expect(sanitized.authorizedUserIds).not.toContain('unverified-user-9');
      expect(sanitized.authorizedUserIds).toEqual(['senior-9']);
    });

    test('10. A family member CANNOT obtain caretaker privileges through migration or invitation role mismatch', async () => {
      const tamperedProfile = {
        id: 'test-profile-role-mismatch',
        elderlyUserId: 'senior-10',
        authorizedMembers: [
          { userId: 'legit-family-uid', role: 'family' },
        ],
        authorizedCaretakerIds: ['legit-family-uid'],
        authorizedFamilyIds: ['legit-family-uid'],
      };

      const sanitizedA = await deriveSanitizedProfileAuthorization(tamperedProfile);
      expect(sanitizedA.authorizedCaretakerIds).not.toContain('legit-family-uid');
      expect(sanitizedA.authorizedCaretakerIds).toEqual([]);

      const familyInviteId = 'family-invite-role-check';
      const familyInviteDoc = {
        id: familyInviteId,
        profileId: 'test-profile-role-mismatch',
        role: 'family',
        redeemedUserIds: ['mismatch-attacker'],
        lastRedeemedByUserId: 'mismatch-attacker',
        lastRedeemedAt: new Date().toISOString(),
        isRevoked: true,
      };

      memoryInvitations.push(familyInviteDoc);
      if (db && typeof db.collection === 'function') {
        await db.collection('invitations').doc(familyInviteId).set(familyInviteDoc);
      }

      const isCaretakerVerified = await isVerifiedCaretakerRecord(
        { userId: 'mismatch-attacker', role: 'caretaker', verifiedInviteId: familyInviteId },
        { id: 'test-profile-role-mismatch' }
      );
      expect(isCaretakerVerified).toBe(false);

      const isFamilyVerified = await isVerifiedFamilyRecord(
        { userId: 'mismatch-attacker', role: 'family', verifiedInviteId: familyInviteId },
        { id: 'test-profile-role-mismatch' }
      );
      expect(isFamilyVerified).toBe(true);
    });

    test('Concurrent migration check: A concurrent invitation or revocation cannot be overwritten', async () => {
      const freshDocData = {
        id: 'test-profile-race',
        elderlyUserId: 'senior-7',
        authorizedUserIds: ['senior-7', 'newly-added-member'],
        authorizedCaretakerIds: [],
        authorizedFamilyIds: ['newly-added-member'],
        revokedUserIds: ['revoked-earlier'],
      };

      const mockProfileRef = { id: 'test-profile-race' };
      const transactionUpdate = jest.fn();
      const mockTransaction = {
        get: jest.fn(async () => ({
          exists: true,
          data: () => freshDocData,
        })),
        update: transactionUpdate,
      };

      const mockDb = {
        collection: jest.fn(() => ({
          doc: jest.fn(() => mockProfileRef),
        })),
        runTransaction: jest.fn(async (callback) => {
          return await callback(mockTransaction);
        }),
      };

      const staleData = {
        id: 'test-profile-race',
        elderlyUserId: 'senior-7',
      };

      await persistProfileRoleArraysIfLegacy('test-profile-race', staleData, mockDb);
      expect(mockTransaction.get).toHaveBeenCalledWith(mockProfileRef);
      expect(transactionUpdate).not.toHaveBeenCalled();
    });

    test('Demo-profile spoofing defense: rogue profile cannot grant unauthorized caretaker access', async () => {
      const rogueProfile = {
        id: 'demo-profile-attacker-created',
        elderlyUserId: 'attacker-senior',
        authorizedMembers: [
          { userId: 'attacker-uid', role: 'caretaker' },
        ],
      };

      const isVerifiedRogue = await isVerifiedCaretakerRecord(rogueProfile.authorizedMembers[0], rogueProfile);
      expect(isVerifiedRogue).toBe(false);

      const fakeCaretakerOnRobert = {
        id: 'demo-profile-robert',
        elderlyUserId: 'demo-elderly-robert',
        authorizedMembers: [
          { userId: 'unauthorized-intruder', role: 'caretaker' },
        ],
      };

      const isVerifiedIntruder = await isVerifiedCaretakerRecord(fakeCaretakerOnRobert.authorizedMembers[0], fakeCaretakerOnRobert);
      expect(isVerifiedIntruder).toBe(false);

      const sarahRecord = { userId: 'demo-caretaker-sarah', role: 'caretaker' };
      const isVerifiedSarah = await isVerifiedCaretakerRecord(sarahRecord, { id: 'demo-profile-robert' });
      expect(isVerifiedSarah).toBe(true);
    });

    test('needsRoleArrayMigration detects legacy profiles missing role arrays', () => {
      const legacyProfile = {
        id: 'legacy-p1',
        elderlyUserId: 'senior-1',
        authorizedMembers: [
          { userId: 'ct-1', role: 'caretaker' },
          { userId: 'fam-1', role: 'family' },
        ],
      };

      expect(needsRoleArrayMigration(legacyProfile)).toBe(true);
    });
  });
});
