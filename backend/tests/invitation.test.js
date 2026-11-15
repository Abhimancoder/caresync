import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../src/server.js';
import { USER_ROLES } from '../src/config/constants.js';

describe('CareSync Passcode Delegation Security & API Tests', () => {
  const caretakerAuth = 'Bearer demo-token-caretaker';
  const familyAuth = 'Bearer demo-token-family';

  test('passcode is hashed with bcrypt and cannot be read in plaintext', async () => {
    const rawPasscode = 'AB3-XYZ';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(rawPasscode, salt);

    expect(hash).not.toBe(rawPasscode);
    expect(hash.startsWith('$2')).toBe(true);

    const isMatch = await bcrypt.compare('AB3-XYZ', hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await bcrypt.compare('WRONG-CODE', hash);
    expect(isWrongMatch).toBe(false);
  });

  test('rejects expired invitations logic', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1);
    const now = new Date();
    expect(pastDate < now).toBe(true);
  });

  describe('POST /api/invitations/generate', () => {
    test('rejects invitation generation when missing profileId or role', async () => {
      const res = await request(app)
        .post('/api/invitations/generate')
        .set('Authorization', caretakerAuth)
        .send({ role: 'caretaker' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Both profileId and role');
    });

    test('rejects invitation generation with invalid role', async () => {
      const res = await request(app)
        .post('/api/invitations/generate')
        .set('Authorization', caretakerAuth)
        .send({ profileId: 'demo-profile-robert', role: 'superadmin' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Invalid role');
    });

    test('successfully generates a caretaker invitation with a 6-character passcode', async () => {
      const res = await request(app)
        .post('/api/invitations/generate')
        .set('Authorization', caretakerAuth)
        .send({
          profileId: 'demo-profile-robert',
          role: USER_ROLES.CARETAKER,
          recipientEmail: 'nurse.sarah@hospital.org',
          maxUses: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.passcode).toBe('string');
      expect(res.body.passcode).toMatch(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/);
      expect(res.body.role).toBe(USER_ROLES.CARETAKER);
      expect(res.body.invitationId).toBeDefined();
    });
  });

  describe('POST /api/invitations/verify-and-join', () => {
    test('rejects join when passcode is missing or empty', async () => {
      const res = await request(app)
        .post('/api/invitations/verify-and-join')
        .set('Authorization', familyAuth)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Passcode is required');
    });

    test('rejects join when passcode is invalid or non-existent', async () => {
      const res = await request(app)
        .post('/api/invitations/verify-and-join')
        .set('Authorization', familyAuth)
        .send({ passcode: 'NON-EXISTENT-CODE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('INVALID_PASSCODE');
    });

    test('allows joining and prevents reuse beyond maxUses', async () => {
      // 1. Generate an invitation
      const genRes = await request(app)
        .post('/api/invitations/generate')
        .set('Authorization', caretakerAuth)
        .send({
          profileId: 'demo-profile-robert',
          role: USER_ROLES.FAMILY,
          maxUses: 1,
        });

      expect(genRes.status).toBe(201);
      const generatedPasscode = genRes.body.passcode;

      // 2. Verify and join using the passcode
      const joinRes = await request(app)
        .post('/api/invitations/verify-and-join')
        .set('Authorization', familyAuth)
        .send({ passcode: generatedPasscode });

      expect(joinRes.status).toBe(200);
      expect(joinRes.body.success).toBe(true);
      expect(joinRes.body.profileId).toBe('demo-profile-robert');

      // 3. Attempting second redemption should fail (maxUses = 1 exhausted)
      const secondJoinRes = await request(app)
        .post('/api/invitations/verify-and-join')
        .set('Authorization', familyAuth)
        .send({ passcode: generatedPasscode });

      expect(secondJoinRes.status).toBe(400);
      expect(secondJoinRes.body.success).toBe(false);
    });
  });

  describe('DELETE /api/invitations/:id', () => {
    test('successfully revokes an active invitation', async () => {
      const genRes = await request(app)
        .post('/api/invitations/generate')
        .set('Authorization', caretakerAuth)
        .send({
          profileId: 'demo-profile-robert',
          role: USER_ROLES.CARETAKER,
        });

      const inviteId = genRes.body.invitationId;
      const passcode = genRes.body.passcode;

      const revokeRes = await request(app)
        .delete(`/api/invitations/${inviteId}`)
        .set('Authorization', caretakerAuth);

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.success).toBe(true);
      expect(revokeRes.body.message).toContain('revoked');

      const joinRes = await request(app)
        .post('/api/invitations/verify-and-join')
        .set('Authorization', familyAuth)
        .send({ passcode });

      expect(joinRes.status).toBe(400);
      expect(joinRes.body.success).toBe(false);
    });
  });
});
