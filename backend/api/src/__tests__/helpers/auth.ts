/**
 * Real JWTs for integration tests.
 *
 * The point of this helper is what it does NOT do: it never mocks
 * auth.middleware. Tokens are signed with the same JWT_SECRET that
 * src/config/constants.ts reads, so the genuine `protect` verifies them and
 * the genuine `restrictTo` reads the role off the decoded payload.
 *
 * This is a deliberate departure from the pre-existing
 * src/routes/claim.routes.test.ts, which did:
 *
 *   jest.mock('../middleware/auth.middleware', () => ({
 *     protect: (req, _res, next) => { req.user = {...}; next(); },
 *     restrictTo: () => (_req, _res, next) => next(),
 *   }))
 *
 * That stubs out the entire authorisation layer, so the suite could pass with
 * every guard deleted from every route. It is the reason the unauthenticated
 * password-change endpoint in user.routes.ts (DEF-001) went unnoticed.
 */
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { JWT_SECRET } from '../../config/constants';

export interface TokenUser {
  id: number;
  role: Role;
}

/** A genuine token the real `protect` middleware will accept. */
export function signFor(user: TokenUser, expiresIn: string = '1h'): string {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn,
  } as jwt.SignOptions);
}

/** `Authorization` header value, for `.set(...authHeader(user))`. */
export function bearer(user: TokenUser): [string, string] {
  return ['Authorization', `Bearer ${signFor(user)}`];
}

/**
 * A structurally valid token signed with the wrong key. Exercises the
 * jwt.verify failure branch (401 'Not authorized, token failed'), which is
 * distinct from the missing-token branch (401 'Not authorized, invalid or
 * missing token').
 */
export function signWithWrongSecret(user: TokenUser): string {
  return jwt.sign({ id: user.id, role: user.role }, `${JWT_SECRET}-wrong`, {
    expiresIn: '1h',
  });
}

/** An expired but correctly signed token. */
export function signExpired(user: TokenUser): string {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: '-1s',
  });
}
