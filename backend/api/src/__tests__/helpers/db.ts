/**
 * Database fixtures for the integration tier.
 *
 * SAFETY. Every suite in this tier is gated on DATABASE_URL_TEST, and
 * jest.env.ts copies that value over DATABASE_URL. The functions below
 * truncate tables, so that indirection is the guardrail: if DATABASE_URL_TEST
 * is unset the suites skip via `describeDb` and none of this runs. There is no
 * code path that reaches a database whose URL did not come from a *_TEST
 * variable.
 *
 * `User` rows are never truncated. The three demo accounts are fixtures the
 * suites depend on, and prisma/seed.ts deletes every table before recreating
 * them, so wiping users here would mean re-seeding between every test.
 */
import { Role, ClaimStatus, Prisma } from '@prisma/client';
import { db } from '../../config/database';

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'claimflow-demo';

/** Seeded by prisma/seed.ts. Names differ from the report's personas. */
export const DEMO_EMAILS = {
  employee: 'demo.employee@claimflow.com', // Rachel Tan, Sales
  manager: 'demo.manager@claimflow.com', // Lim Wei Ming, Sales
  finance: 'demo.finance@claimflow.com', // Priya Kumar
} as const;

export interface RoleUsers {
  employee: { id: number; role: Role; email: string; name: string };
  manager: { id: number; role: Role; email: string; name: string };
  finance: { id: number; role: Role; email: string; name: string };
  /** A second Employee, for cross-user ownership checks. */
  otherEmployee: { id: number; role: Role; email: string; name: string };
}

/**
 * Loads the seeded demo accounts. Throws a directive error rather than
 * returning undefined, because every downstream assertion would otherwise fail
 * with a confusing "cannot read property id of undefined".
 */
export async function loadRoleUsers(): Promise<RoleUsers> {
  const select = { id: true, role: true, email: true, name: true };

  const [employee, manager, finance] = await Promise.all([
    db.user.findUnique({ where: { email: DEMO_EMAILS.employee }, select }),
    db.user.findUnique({ where: { email: DEMO_EMAILS.manager }, select }),
    db.user.findUnique({ where: { email: DEMO_EMAILS.finance }, select }),
  ]);

  if (!employee || !manager || !finance) {
    throw new Error(
      'Demo accounts missing from the test database. Seed it first:\n' +
        '  cd backend/api\n' +
        '  DATABASE_URL="$DATABASE_URL_TEST" npx prisma db push\n' +
        '  DATABASE_URL="$DATABASE_URL_TEST" npx ts-node prisma/seed.ts',
    );
  }

  // Any other Employee will do for the "not your claim" cases.
  const otherEmployee = await db.user.findFirst({
    where: { role: Role.Employee, email: { not: DEMO_EMAILS.employee } },
    select,
  });

  if (!otherEmployee) {
    throw new Error('Test database needs at least two Employee accounts.');
  }

  return { employee, manager, finance, otherEmployee };
}

/**
 * Removes claim-derived rows. Order matters: Notification and AuditLog both
 * carry a claimId foreign key, so they go first.
 *
 * Users are intentionally left alone — see the module comment.
 */
export async function resetClaimData(): Promise<void> {
  await db.notification.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.claim.deleteMany({});
}

export interface MakeClaimOptions {
  userId: number;
  status?: ClaimStatus;
  amount?: number;
  category?: string;
  merchant?: string;
  receiptUrl?: string | null;
  expenseDate?: Date;
  withdrawn?: boolean;
  ocrSource?: string | null;
  details?: Prisma.InputJsonValue | null;
  gstAmount?: number | null;
}

/**
 * Inserts a claim directly, bypassing the policy engine and the controller.
 *
 * That is the point for state-machine tests: to check that Pending cannot go
 * straight to Paid, the fixture has to be able to create a Pending claim
 * regardless of what the policy rules would have decided on submission.
 */
export async function makeClaim(opts: MakeClaimOptions) {
  const {
    userId,
    status = ClaimStatus.Pending,
    amount = 42.5,
    category = 'Transport',
    merchant = 'Grab',
    receiptUrl = '/test-receipts/real-grab.png',
    // Default to the past: several shipped rules block future-dated expenses.
    expenseDate = new Date(Date.now() - 3 * 86_400_000),
    withdrawn = false,
    ocrSource = 'azure',
    details = null,
    gstAmount = null,
  } = opts;

  return db.claim.create({
    data: {
      userId,
      amount,
      gstAmount,
      merchant,
      category,
      expenseDate,
      receiptUrl,
      ocrSource,
      status,
      withdrawn,
      ...(details === null ? {} : { details }),
    },
  });
}

/** Audit rows for one claim, newest first. */
export async function auditFor(claimId: number) {
  return db.auditLog.findMany({
    where: { claimId },
    orderBy: { createdAt: 'desc' },
  });
}

/** Notifications for one claim. */
export async function notificationsFor(claimId: number) {
  return db.notification.findMany({ where: { claimId } });
}

export async function findClaim(claimId: number) {
  return db.claim.findUnique({ where: { id: claimId } });
}

export async function disconnect(): Promise<void> {
  await db.$disconnect();
}

export { db };
