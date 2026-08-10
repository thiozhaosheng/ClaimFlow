/**
 * Integration tests — the password and user-listing endpoints (`/api/users`).
 *
 * This is the regression suite for DEF-001: an unauthenticated account
 * takeover. `PATCH /api/users/update-password` used to read the target account
 * from `req.body.email` on a route with no `protect`, so a request carrying no
 * token at all reset any account whose email was known.
 *
 * These run against a REAL Postgres and the REAL auth middleware. That is the
 * point. The pre-existing unit suite for this router mocks auth.middleware
 * wholesale, so it would pass with every guard deleted from every route —
 * which is exactly how DEF-001 survived. Here the tokens are genuine, `protect`
 * really verifies them, and the password changes are really written to and read
 * back from the database.
 *
 * Skipped in full when DATABASE_URL_TEST is unset. See ../__tests__/helpers/describeDb.
 */
import request from 'supertest';
import bcrypt from 'bcrypt';
import { makeApp } from '../__tests__/helpers/testApp';
import { describeDb } from '../__tests__/helpers/describeDb';
import {
  signFor,
  signWithWrongSecret,
  signExpired,
} from '../__tests__/helpers/auth';
import {
  db,
  loadRoleUsers,
  disconnect,
  DEMO_PASSWORD,
  type RoleUsers,
} from '../__tests__/helpers/db';

const app = makeApp();
const UPDATE = '/api/users/update-password';

describeDb('Users API (real database, real auth middleware)', () => {
  let users: RoleUsers;

  /**
   * The demo accounts are shared fixtures and this suite changes a password for
   * real, so the original hash is captured up front and restored after every
   * test. Without this a single run would lock the demo login the capstone
   * presentation depends on.
   */
  let originalHashes: Map<number, string>;

  beforeAll(async () => {
    users = await loadRoleUsers();
    const rows = await db.user.findMany({
      where: { id: { in: [users.employee.id, users.finance.id, users.otherEmployee.id] } },
      select: { id: true, passwordHash: true },
    });
    originalHashes = new Map(rows.map(r => [r.id, r.passwordHash]));
  });

  afterEach(async () => {
    // Restore byte-for-byte rather than re-hashing DEMO_PASSWORD: bcrypt salts
    // each hash differently, and the goal is to leave the row exactly as found.
    for (const [id, passwordHash] of originalHashes) {
      await db.user.update({ where: { id }, data: { passwordHash } });
    }
  });

  afterAll(disconnect);

  describe('DEF-001 — PATCH /users/update-password requires authentication', () => {
    it('rejects a request with no token at all (401) and leaves the password intact', async () => {
      const res = await request(app)
        .patch(UPDATE)
        .send({ email: users.finance.email, newPassword: 'attacker-chosen-password' });

      // The takeover attempt is refused...
      expect(res.status).toBe(401);

      // ...and, more importantly, the account is untouched. Asserting the
      // status alone would still pass if the write happened before the
      // rejection was returned.
      const after = await db.user.findUnique({
        where: { id: users.finance.id },
        select: { passwordHash: true },
      });
      expect(await bcrypt.compare('attacker-chosen-password', after!.passwordHash)).toBe(false);
      expect(await bcrypt.compare(DEMO_PASSWORD, after!.passwordHash)).toBe(true);
    });

    it('rejects a token signed with the wrong secret (401)', async () => {
      const res = await request(app)
        .patch(UPDATE)
        .set('Authorization', `Bearer ${signWithWrongSecret(users.employee)}`)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'irrelevant' });

      expect(res.status).toBe(401);
    });

    it('rejects an expired token (401)', async () => {
      const res = await request(app)
        .patch(UPDATE)
        .set('Authorization', `Bearer ${signExpired(users.employee)}`)
        .send({ currentPassword: DEMO_PASSWORD, newPassword: 'irrelevant' });

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /users/update-password acts only on the caller', () => {
    it('ignores an email in the body and changes only the authenticated account', async () => {
      // The employee authenticates as themselves but names the Finance Admin
      // in the body — the original shape of the takeover, now with a token.
      const res = await request(app)
        .patch(UPDATE)
        .set('Authorization', `Bearer ${signFor(users.employee)}`)
        .send({
          email: users.finance.email,
          currentPassword: DEMO_PASSWORD,
          newPassword: 'employee-new-password',
        });

      expect(res.status).toBe(200);

      // The Finance Admin is untouched...
      const finance = await db.user.findUnique({
        where: { id: users.finance.id },
        select: { passwordHash: true },
      });
      expect(await bcrypt.compare('employee-new-password', finance!.passwordHash)).toBe(false);
      expect(await bcrypt.compare(DEMO_PASSWORD, finance!.passwordHash)).toBe(true);

      // ...and the caller's own password is what actually changed.
      const employee = await db.user.findUnique({
        where: { id: users.employee.id },
        select: { passwordHash: true },
      });
      expect(await bcrypt.compare('employee-new-password', employee!.passwordHash)).toBe(true);
    });

    it('refuses a change when the current password is wrong (401)', async () => {
      const res = await request(app)
        .patch(UPDATE)
        .set('Authorization', `Bearer ${signFor(users.employee)}`)
        .send({ currentPassword: 'not-the-current-password', newPassword: 'should-not-apply' });

      expect(res.status).toBe(401);

      const after = await db.user.findUnique({
        where: { id: users.employee.id },
        select: { passwordHash: true },
      });
      expect(await bcrypt.compare('should-not-apply', after!.passwordHash)).toBe(false);
    });

    it('requires both currentPassword and newPassword (400)', async () => {
      const res = await request(app)
        .patch(UPDATE)
        .set('Authorization', `Bearer ${signFor(users.employee)}`)
        .send({ newPassword: 'missing-the-current-one' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /users', () => {
    it('requires a token (401)', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('never returns password hashes to an authenticated caller', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${signFor(users.finance)}`);

      expect(res.status).toBe(200);
      expect(res.body.data.users.length).toBeGreaterThan(0);

      for (const user of res.body.data.users) {
        expect(user).not.toHaveProperty('passwordHash');
      }
      // Belt and braces: no bcrypt hash anywhere in the serialised payload,
      // whatever key it might have been nested under.
      expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
    });
  });
});
