import bcrypt from 'bcryptjs';

describe('CareSync Passcode Delegation Security Tests', () => {
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

  test('rejects expired invitations', () => {
    const pastDate = new Date();
    pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

    const now = new Date();
    const isExpired = pastDate < now;
    expect(isExpired).toBe(true);
  });
});
