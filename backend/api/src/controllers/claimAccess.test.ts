/**
 * Who may reach a claim by its id.
 *
 * The department rule used to live only in the LIST query
 * (getClaimsByDepartment), so every by-id route was open to any Manager in the
 * company: a Sales approver could pull a Marketing claim's record, its audit
 * trail and a signed URL for its receipt, and could endorse or reject it, just
 * by knowing the number — and the numbers increment. Confirmed against a
 * running stack before the fix, which is why these are here: the rule is one
 * function now, and this is the test that keeps it honest.
 */
import { Role } from '@prisma/client';
import { canAccessClaim } from './claim.controller';
import * as userModel from '../models/user.model';

jest.mock('../models/user.model');

const mockedFindById = userModel.findById as jest.MockedFunction<
  typeof userModel.findById
>;

const SALES_APPROVER = { id: 1, role: Role.Manager };
const MARKETING_APPROVER = { id: 2, role: Role.Manager };
const EMPLOYEE = { id: 10, role: Role.Employee };
const FINANCE = { id: 20, role: Role.FinanceAdmin };

/** A claim submitted by user 10, who is in Sales. */
const SALES_CLAIM = { userId: 10 };

const people: Record<number, { id: number; department: string | null }> = {
  1: { id: 1, department: 'Sales' },
  2: { id: 2, department: 'Marketing' },
  10: { id: 10, department: 'Sales' },
  20: { id: 20, department: null },
};

beforeEach(() => {
  mockedFindById.mockImplementation(
    async (id: number) => (people[id] ?? null) as any,
  );
});

describe('canAccessClaim', () => {
  it('lets finance reach any claim — they settle every one and file the GST', async () => {
    await expect(canAccessClaim(FINANCE, SALES_CLAIM)).resolves.toBe(true);
  });

  it('lets a submitter reach their own claim', async () => {
    await expect(canAccessClaim(EMPLOYEE, SALES_CLAIM)).resolves.toBe(true);
  });

  it("refuses an employee someone else's claim", async () => {
    await expect(
      canAccessClaim({ id: 11, role: Role.Employee }, SALES_CLAIM),
    ).resolves.toBe(false);
  });

  it('lets an approver reach a claim from their own department', async () => {
    await expect(canAccessClaim(SALES_APPROVER, SALES_CLAIM)).resolves.toBe(true);
  });

  // The one this file exists for.
  it('refuses an approver a claim from another department', async () => {
    await expect(canAccessClaim(MARKETING_APPROVER, SALES_CLAIM)).resolves.toBe(
      false,
    );
  });

  it('refuses an approver who has no department rather than opening everything', async () => {
    const noDept = { id: 3, role: Role.Manager };
    people[3] = { id: 3, department: null };
    await expect(canAccessClaim(noDept, SALES_CLAIM)).resolves.toBe(false);
    delete people[3];
  });

  it('refuses when the submitter cannot be found', async () => {
    await expect(canAccessClaim(SALES_APPROVER, { userId: 999 })).resolves.toBe(
      false,
    );
  });

  it('still lets an approver open a claim they submitted themselves', async () => {
    // A manager's own expense claim sits outside the department test, and
    // failing that would lock them out of their own record.
    await expect(
      canAccessClaim(MARKETING_APPROVER, { userId: MARKETING_APPROVER.id }),
    ).resolves.toBe(true);
  });
});
