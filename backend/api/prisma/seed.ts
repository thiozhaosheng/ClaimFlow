import { PrismaClient, Role, ClaimStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { receiptSvg, ReceiptSpec } from './receiptImage';

dotenv.config();

const db = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'claimflow-demo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Generated receipts live with the other fixtures the frontend serves. The
// seed is deterministic, so these files are stable across runs and are
// committed; the directory is emptied first so a changed dataset cannot leave
// orphans behind.
const SEED_RECEIPT_DIR = path.resolve(
  __dirname,
  '../../../frontend/public/test-receipts/seed',
);

function resetSeedReceipts() {
  fs.rmSync(SEED_RECEIPT_DIR, { recursive: true, force: true });
  fs.mkdirSync(SEED_RECEIPT_DIR, { recursive: true });
}

function writeSeedReceipt(index: number, spec: ReceiptSpec) {
  fs.writeFileSync(
    path.join(SEED_RECEIPT_DIR, `${String(index).padStart(4, '0')}.svg`),
    receiptSvg(spec),
    'utf8',
  );
}

const rng = (() => {
  let s = 0xc0ffee;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
})();

const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;
const chance = (p: number) => rng() < p;
const round2 = (n: number) => Math.round(n * 100) / 100;
const slugEmail = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]+/g, '.')
    .replace(/^\.|\.$/g, '');
// No avatar URLs are seeded. They pointed at pravatar.cc — photographs of
// strangers, fetched from a third party, stored against staff records in a
// product whose selling point is PDPA custody. Nothing in the app renders one
// either: the claims API does not return the column and every surface that
// shows a person uses their initials.
const avatarFor = (_email: string): string | null => null;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randInt(8, 19), randInt(0, 59), 0, 0);
  return d;
};

/**
 * A working moment strictly after `base`, and never in the future.
 *
 * Every timestamp in the demo used to be computed independently from the
 * claim's age — `daysAgo(ageDays)`, `daysAgo(ageDays - randInt(1, 3))` — which
 * randomises the hour on each call. So a claim could be endorsed at 09:04 on a
 * day it was submitted at 15:20, and an eight-day-old claim approved "one to
 * three days later" could be approved before it existed. Chaining from the
 * previous event is what makes an audit trail read in order.
 */
const after = (base: Date, minDays: number, maxDays: number) => {
  const d = new Date(base.getTime());
  d.setDate(d.getDate() + randInt(minDays, maxDays));
  d.setHours(randInt(9, 18), randInt(0, 59), 0, 0);
  if (d <= base) d.setTime(base.getTime() + randInt(20, 300) * 60_000);
  const now = new Date();
  return d > now ? now : d;
};

// ---------------------------------------------------------------------------
// Org structure — a believable 30-person Singapore SME
// ---------------------------------------------------------------------------

const DEPARTMENTS = [
  'Sales',
  'Engineering',
  'Marketing',
  'Operations',
  'Customer Success',
  'HR',
] as const;

interface PersonSpec {
  name: string;
  role: Role;
  department?: string;
  emailOverride?: string;
}

// Three named demo accounts so login docs / sign-in screen stay stable
const DEMO_EMPLOYEE: PersonSpec = {
  name: 'Rachel Tan',
  role: Role.Employee,
  department: 'Sales',
  emailOverride: 'demo.employee@claimflow.com',
};
const DEMO_MANAGER: PersonSpec = {
  name: 'Lim Wei Ming',
  role: Role.Manager,
  department: 'Sales',
  emailOverride: 'demo.manager@claimflow.com',
};
const DEMO_FINANCE: PersonSpec = {
  name: 'Priya Kumar',
  role: Role.FinanceAdmin,
  emailOverride: 'demo.finance@claimflow.com',
};

const MANAGERS: PersonSpec[] = [
  { name: 'Daniel Wong', role: Role.Manager, department: 'Engineering' },
  { name: 'Nurul Hidayah', role: Role.Manager, department: 'Marketing' },
  { name: 'Vikram Shetty', role: Role.Manager, department: 'Operations' },
  { name: 'Felicia Goh', role: Role.Manager, department: 'Customer Success' },
  { name: 'Tan Mei Ling', role: Role.Manager, department: 'HR' },
];

const FINANCE_TEAM: PersonSpec[] = [
  { name: 'Marcus Yeo', role: Role.FinanceAdmin },
];

const EMPLOYEES: PersonSpec[] = [
  // Sales (3 + demo employee = 4)
  { name: 'Aaron Chua', role: Role.Employee, department: 'Sales' },
  { name: 'Siti Aminah', role: Role.Employee, department: 'Sales' },
  { name: 'Jonathan Koh', role: Role.Employee, department: 'Sales' },
  // Engineering (5)
  { name: 'Ravi Kumar', role: Role.Employee, department: 'Engineering' },
  { name: 'Sarah Lim', role: Role.Employee, department: 'Engineering' },
  { name: 'Ethan Ng', role: Role.Employee, department: 'Engineering' },
  { name: 'Joanne Teo', role: Role.Employee, department: 'Engineering' },
  { name: 'Hafiz Rahman', role: Role.Employee, department: 'Engineering' },
  // Marketing (3)
  { name: 'Cheryl Ong', role: Role.Employee, department: 'Marketing' },
  { name: 'Brandon Lee', role: Role.Employee, department: 'Marketing' },
  { name: 'Indrani Devi', role: Role.Employee, department: 'Marketing' },
  // Operations (3)
  { name: 'Jasmine Loh', role: Role.Employee, department: 'Operations' },
  { name: 'Kelvin Sim', role: Role.Employee, department: 'Operations' },
  { name: 'Megan Chia', role: Role.Employee, department: 'Operations' },
  // Customer Success (3)
  { name: 'Aishah Yusof', role: Role.Employee, department: 'Customer Success' },
  { name: 'Tristan Goh', role: Role.Employee, department: 'Customer Success' },
  { name: 'Yong Jian', role: Role.Employee, department: 'Customer Success' },
  // HR (2)
  { name: 'Beverly Tan', role: Role.Employee, department: 'HR' },
  { name: 'Arjun Menon', role: Role.Employee, department: 'HR' },
];

// ---------------------------------------------------------------------------
// Claim recipes — realistic SME categories with merchant + amount ranges
// ---------------------------------------------------------------------------

interface ClaimRecipe {
  category: string;
  merchants: string[];
  amountRange: [number, number];
  gstRate?: number; // 0.09 default if undefined
  receiptOdds?: number; // 1 by default — likelihood receipt present
}

// Per-category details realistic SMEs would supply. Generates plausible
// values per claim so the demo dataset shows the per-category panels filled.
function generateDetailsFor(category: string, amount: number): any {
  switch (category) {
    case 'Transport': {
      const purposes = [
        'Client meeting',
        'Off-site work',
        'Late OT return',
        'Site inspection',
        'Airport pickup/drop-off',
        'Inter-office shuttle',
      ];
      const windows = [
        'Morning (06-12)',
        'Afternoon (12-18)',
        'Evening (18-22)',
        'Late night (22-06)',
      ];
      const places = [
        'Office (Toa Payoh)',
        'Office (Suntec)',
        'Client (Marina Bay)',
        'Client (Tampines)',
        'Site (Tuas)',
        'Airport (Changi)',
        'Home (Bishan)',
        'Home (Woodlands)',
      ];
      return {
        fromLocation: pick(places),
        toLocation: pick(places),
        tripPurpose: pick(purposes),
        travelWindow: pick(windows),
      };
    }
    case 'Meal': {
      const occasions = [
        'Solo working meal',
        'Team meal',
        'Working lunch with client',
        'OT dinner (after 20:00)',
        'Project celebration',
      ];
      const attendees = amount > 50 ? randInt(3, 8) : randInt(1, 3);
      const occasion = amount > 60 ? pick(['Team meal', 'Working lunch with client', 'OT dinner (after 20:00)']) : pick(occasions);
      return {
        occasion,
        attendees,
        attendeeNotes:
          attendees > 1
            ? `${attendees - 1} internal teammate${attendees - 1 === 1 ? '' : 's'}`
            : '',
      };
    }
    case 'Client Entertainment': {
      const companies = ['Acme Pte Ltd', 'Globex Asia', 'Initech SG', 'Soylent Foods', 'Hooli APAC', 'Pied Piper Sg'];
      const internalCount = randInt(2, 4);
      const externalCount = randInt(2, 5);
      return {
        clientCompany: pick(companies),
        clientContacts: 'Jane Lim, Marcus Wee',
        internalCount,
        externalCount,
        businessJustification:
          'Quarterly business review and discussion of expanded contract scope for FY26.',
        gstRegNumber: amount > 1000 ? '198703169W' : '',
      };
    }
    case 'Office Supplies': {
      const items = [
        '5 reams A4 paper, USB-C hub, sticky notes',
        'Whiteboard markers (assorted), magnetic pins',
        'Coffee pods (Nespresso) for office machine',
        'Printer toner, paper clips, A3 envelopes',
        'Ergonomic mouse, mouse pad, monitor stand',
      ];
      return {
        itemSummary: pick(items),
        forTeam: '',
      };
    }
    case 'Travel': {
      const dests = [
        'Kuala Lumpur, Malaysia',
        'Bangkok, Thailand',
        'Jakarta, Indonesia',
        'Tokyo, Japan',
        'Sydney, Australia',
      ];
      const purposes = [
        'Regional kickoff with APAC distributors.',
        'Client onsite for delivery acceptance.',
        'Vendor audit for new ERP roll-out.',
        'Industry conference (sponsorship + booth).',
      ];
      const days = randInt(2, 5);
      const depart = new Date();
      depart.setDate(depart.getDate() - randInt(10, 30));
      const ret = new Date(depart);
      ret.setDate(ret.getDate() + days);
      return {
        destination: pick(dests),
        departureDate: depart.toISOString().slice(0, 10),
        returnDate: ret.toISOString().slice(0, 10),
        tripPurpose: pick(purposes),
        mode: pick(['Flight', 'Flight', 'Flight', 'Train']),
      };
    }
    case 'Training': {
      const courses = [
        { name: 'AWS Solutions Architect Associate', provider: 'AWS Training' },
        { name: 'Advanced React Patterns', provider: 'Frontend Masters' },
        { name: 'Project Management Professional', provider: 'PMI' },
        { name: 'Singapore SME Tax Workshop', provider: 'SMU Academy' },
        { name: 'Effective B2B Negotiation', provider: 'NUS ISS' },
      ];
      const c = pick(courses);
      const start = new Date();
      start.setDate(start.getDate() - randInt(5, 40));
      const end = new Date(start);
      end.setDate(end.getDate() + randInt(0, 4));
      return {
        courseName: c.name,
        provider: c.provider,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        businessJustification:
          'Builds capability we need for the current FY roadmap; gap identified in last skills review.',
      };
    }
    case 'Medical (statutory)': {
      const types = [
        'Pre-employment medical',
        'Statutory annual check-up',
        'WICA-covered work injury',
        'Other statutory medical',
      ];
      return {
        clinic: pick(['Raffles Medical Tampines', 'Parkway Shenton Suntec', 'Healthway Toa Payoh']),
        treatmentType: pick(types),
        referenceCase: '',
      };
    }
    default:
      return null;
  }
}

const RECIPES: ClaimRecipe[] = [
  {
    category: 'Transport',
    merchants: ['Grab', 'Gojek', 'TADA', 'ComfortDelGro Taxi', 'SimplyGo'],
    amountRange: [6, 48],
  },
  {
    category: 'Meal',
    merchants: [
      'Toast Box',
      'Ya Kun Kaya Toast',
      'Old Chang Kee',
      'Hawker Centre — Maxwell',
      'Crystal Jade La Mian',
      'Subway',
      'Starbucks',
      "McDonald's",
    ],
    amountRange: [8, 28],
  },
  {
    category: 'Meal',
    // Slightly more expensive lunch tier — these will route to human
    merchants: ['Ippudo', 'PS.Cafe', 'Common Man Coffee Roasters', 'Tiong Bahru Bakery'],
    amountRange: [32, 75],
  },
  {
    category: 'Client Entertainment',
    merchants: [
      'Burnt Ends',
      'Jumbo Seafood',
      'Imperial Treasure',
      'Wakuda Marina Bay Sands',
      'TIPPLING CLUB',
    ],
    amountRange: [180, 720],
  },
  {
    category: 'Office Supplies',
    merchants: ['NTUC FairPrice', 'Popular Bookstore', 'Cold Storage', 'Daiso', 'Challenger'],
    amountRange: [12, 180],
  },
  {
    category: 'Travel',
    merchants: ['Singapore Airlines', 'Scoot', 'Booking.com', 'Agoda', 'Klook'],
    amountRange: [320, 1850],
  },
  {
    category: 'Training',
    merchants: ['Coursera', 'Udemy', 'AWS Training', 'SMU Academy', 'NUS ISS'],
    amountRange: [85, 950],
  },
  {
    category: 'Medical (statutory)',
    merchants: ['Raffles Medical', 'Healthway Medical', 'Parkway Shenton'],
    amountRange: [45, 280],
  },
];

const REJECTION_REASONS = [
  'Receipt date does not match expense date — please re-upload the correct receipt.',
  'Merchant on receipt is the company canteen vendor — already billed centrally.',
  'Amount on receipt differs from the claim amount. Please correct and resubmit.',
  'Duplicate of CLM-#### already approved last month.',
  'Category should be Training, not Meal — please re-categorise and resubmit.',
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Cleaning up existing data…');
  await db.notification.deleteMany({});
  await db.auditLog.deleteMany({});
  await db.claim.deleteMany({});
  await db.user.deleteMany({});

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ------ users ----------------------------------------------------------
  console.log('Creating users…');
  const specs: PersonSpec[] = [
    DEMO_EMPLOYEE,
    DEMO_MANAGER,
    DEMO_FINANCE,
    ...MANAGERS,
    ...FINANCE_TEAM,
    ...EMPLOYEES,
  ];

  const usedEmails = new Set<string>();
  const users = await Promise.all(
    specs.map(async (spec) => {
      let email = spec.emailOverride;
      if (!email) {
        const base = `${slugEmail(spec.name)}@claimflow.sg`;
        let candidate = base;
        let n = 2;
        while (usedEmails.has(candidate)) {
          candidate = base.replace('@', `${n}@`);
          n++;
        }
        email = candidate;
      }
      usedEmails.add(email);
      return db.user.create({
        data: {
          name: spec.name,
          email,
          passwordHash,
          role: spec.role,
          department: spec.department,
          avatarUrl: avatarFor(email),
        },
      });
    }),
  );
  console.log(`  created ${users.length} users`);

  const employees = users.filter((u) => u.role === Role.Employee);
  const managers = users.filter((u) => u.role === Role.Manager);
  const finance = users.filter((u) => u.role === Role.FinanceAdmin);
  const managerByDept = new Map(managers.map((m) => [m.department, m]));
  const primaryFinance = finance[0];

  // ------ claims + audit + notifications --------------------------------
  console.log('Generating claims spread over 60 days…');
  resetSeedReceipts();

  let auditCount = 0;
  let notifCount = 0;
  let claimCount = 0;

  for (const employee of employees) {
    // Each employee submits 5-9 claims over the last 60 days
    const numClaims = randInt(5, 9);
    for (let i = 0; i < numClaims; i++) {
      const recipe = pick(RECIPES);
      const ageDays = randInt(0, 60);
      const amount = round2(
        recipe.amountRange[0] +
          rng() * (recipe.amountRange[1] - recipe.amountRange[0]),
      );
      const merchant = pick(recipe.merchants);
      const expenseDate = daysAgo(ageDays);
      // Nobody files a claim the instant they pay. Submission is nought to two
      // days later, and it is what `createdAt` is set to — the column was left
      // to its default, so every claim in the demo reported that it had been
      // submitted at the moment the seed ran, on a record whose audit entries
      // were dated weeks earlier.
      const submittedAt = after(expenseDate, 0, 2);
      // The receipt is drawn from this claim, so the image and the fields
      // cannot disagree. Category-matched photographs were the previous fix
      // and they were not enough: three images cannot carry 140 claims, so a
      // Scoot flight still showed a S$24.50 taxi slip while the claim was
      // marked as read by the scanner. See prisma/receiptImage.ts.
      const receiptIndex = claimCount;
      const receiptUrl = `/test-receipts/seed/${String(receiptIndex).padStart(4, '0')}.svg`;

      // 4% had OCR fail (Azure unavailable / manual entry)
      const ocrSource = chance(0.04) ? 'unavailable' : 'azure';
      // 9% GST captured (since GST rate 9% in SG; we record gst amount when known)
      const gstAmount = chance(0.65) ? round2(amount * 0.09 / 1.09) : null;

      writeSeedReceipt(receiptIndex, {
        merchant,
        date: expenseDate.toISOString().slice(0, 10),
        category: recipe.category,
        total: amount,
        gst: gstAmount,
        reference: `R-${String(receiptIndex).padStart(4, '0')}`,
      });

      // Decide final status using the same logic as production:
      // - block conditions never make it to the DB (we just skip them)
      // - auto-approve conditions become Endorsed (and sometimes Paid)
      // - everything else is Pending, then evolves into Endorsed/Rejected/Paid based on age

      const blocked = chance(0.05); // 5% chance of being withdrawn
      const withdrawnAt = after(submittedAt, 0, 1);
      if (blocked) {
        // Replace with a withdrawn-by-submitter row so the dataset shows
        // how blocks surface in history without polluting active queues.
        const claim = await db.claim.create({
          data: {
            userId: employee.id,
            amount,
            gstAmount,
            merchant,
            category: recipe.category,
            expenseDate,
            receiptUrl,
            ocrSource,
            status: ClaimStatus.Pending,
            createdAt: submittedAt,
            withdrawn: true,
            withdrawnAt: withdrawnAt,
          },
        });
        await db.auditLog.create({
          data: {
            claimId: claim.id,
            action: 'WITHDRAWN_BY_SUBMITTER',
            performedBy: employee.id,
            oldStatus: ClaimStatus.Pending,
            newStatus: ClaimStatus.Pending,
            remarks: 'Withdrawn by the submitter before anyone acted on it.',
            createdAt: withdrawnAt,
          },
        });
        claimCount++;
        auditCount++;
        continue;
      }

      const autoApproveMeal =
        recipe.category === 'Meal' && amount <= 30;
      const autoApproveTransport =
        recipe.category === 'Transport' && amount <= 50;
      // The OCR-unavailable claims must NOT auto-approve even if they would
      // otherwise qualify — the approving officer must double-check.
      const wouldAutoApprove =
        (autoApproveMeal || autoApproveTransport) && ocrSource !== 'unavailable';
      const largeAmount = amount > 500;

      let status: ClaimStatus = ClaimStatus.Pending;
      if (wouldAutoApprove) {
        status = ClaimStatus.Endorsed;
        // Older auto-endorsements get paid out
        if (ageDays > 7 && chance(0.85)) status = ClaimStatus.Paid;
      } else if (largeAmount) {
        // Big-amount route-to-human: ~70% endorsed, 15% rejected, 15% still pending
        const r = rng();
        if (r < 0.7) status = ageDays > 4 ? ClaimStatus.Endorsed : ClaimStatus.Pending;
        else if (r < 0.85) status = ClaimStatus.Rejected;
        else status = ClaimStatus.Pending;
        if (status === ClaimStatus.Endorsed && ageDays > 14 && chance(0.6))
          status = ClaimStatus.Paid;
      } else {
        // Normal pending → most clear within a week
        if (ageDays < 1) status = ClaimStatus.Pending;
        else if (ageDays < 3) status = chance(0.7) ? ClaimStatus.Endorsed : ClaimStatus.Pending;
        else if (ageDays < 7) {
          const r = rng();
          if (r < 0.8) status = ClaimStatus.Endorsed;
          else if (r < 0.92) status = ClaimStatus.Rejected;
          else status = ClaimStatus.Pending;
        } else {
          const r = rng();
          if (r < 0.75) status = ClaimStatus.Paid;
          else if (r < 0.88) status = ClaimStatus.Endorsed;
          else status = ClaimStatus.Rejected;
        }
      }

      const claim = await db.claim.create({
        data: {
          userId: employee.id,
          amount,
          gstAmount,
          merchant,
          category: recipe.category,
          expenseDate,
          receiptUrl,
          ocrSource,
          details: generateDetailsFor(recipe.category, amount),
          status,
          createdAt: submittedAt,
        },
      });
      claimCount++;

      // ---- audit trail ----------------------------------------------------
      const deptManager = managerByDept.get(employee.department || '');
      const approver = deptManager ?? managers[0];

      if (wouldAutoApprove) {
        // The engine recommends; it does not approve. This wrote
        // AUTO_APPROVAL_BY_POLICY and moved the claim Pending -> Endorsed with
        // the submitter as the actor, so the demo audit trail showed the engine
        // approving claims on its own — the exact behaviour the product was
        // changed to remove, on the one screen a reader goes to for proof of
        // what happened. It now matches what createClaim actually writes.
        await db.auditLog.create({
          data: {
            claimId: claim.id,
            action: 'POLICY_RECOMMENDED_APPROVAL',
            performedBy: employee.id,
            oldStatus: ClaimStatus.Pending,
            newStatus: ClaimStatus.Pending,
            remarks: autoApproveMeal ? 'auto-approve-small-meal' : 'auto-approve-transport',
            createdAt: submittedAt,
          },
        });
        auditCount++;

        // Notification to approver
        await db.notification.create({
          data: {
            recipientId: approver.id,
            claimId: claim.id,
            kind: 'recommended',
            title: `Ready to approve: ${employee.name}`,
            body: `${recipe.category} · ${merchant} · S$${amount.toFixed(2)} — within ${autoApproveMeal ? 'meal' : 'transport'} allowance.`,
            hint: autoApproveMeal
              ? 'Within the meal allowance and the receipt read cleanly — verify the amount and approve.'
              : 'Within the transport allowance and the receipt read cleanly — verify the amount and approve.',
            createdAt: submittedAt,
          },
        });
        notifCount++;

        // A recommendation is not an endorsement: something an officer did has
        // to stand between Pending and Endorsed, or the trail cannot explain
        // how the claim moved.
        const endorsedAt = after(submittedAt, 1, 3);
        if (status === ClaimStatus.Endorsed || status === ClaimStatus.Paid) {
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'MANAGER_APPROVAL',
              performedBy: approver.id,
              oldStatus: ClaimStatus.Pending,
              newStatus: ClaimStatus.Endorsed,
              remarks: 'Recommended by policy, checked and endorsed.',
              createdAt: endorsedAt,
            },
          });
          auditCount++;
        }

        if (status === ClaimStatus.Paid) {
          const paidAt = after(endorsedAt, 2, 4);
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'FINANCE_REIMBURSEMENT',
              performedBy: primaryFinance.id,
              oldStatus: ClaimStatus.Endorsed,
              newStatus: ClaimStatus.Paid,
              remarks: 'Released in a payout run.',
              createdAt: paidAt,
            },
          });
          auditCount++;
          await db.notification.create({
            data: {
              recipientId: employee.id,
              claimId: claim.id,
              kind: 'claim-paid',
              title: 'Reimbursed',
              body: `S$${amount.toFixed(2)} for ${merchant} has been credited to your bank account.`,
              createdAt: paidAt,
              readAt: after(paidAt, 0, 1),
            },
          });
          notifCount++;
        }
      } else {
        // route-to-human: log entry with the matched-rule hint, plus notif to approver
        const reason = largeAmount
          ? 'route-large-amount'
          : ocrSource === 'unavailable'
          ? 'ocr-unavailable-manual-review'
          : 'default';
        await db.auditLog.create({
          data: {
            claimId: claim.id,
            action: 'ROUTED_TO_HUMAN',
            performedBy: employee.id,
            oldStatus: ClaimStatus.Pending,
            newStatus: ClaimStatus.Pending,
            remarks: reason,
            createdAt: submittedAt,
          },
        });
        auditCount++;
        await db.notification.create({
          data: {
            recipientId: approver.id,
            claimId: claim.id,
            kind: ocrSource === 'unavailable' ? 'ocr-unavailable' : 'route-to-human',
            title:
              ocrSource === 'unavailable'
                ? `Manual review needed: ${employee.name}`
                : `New claim to review: ${employee.name}`,
            body: `${recipe.category} · ${merchant} · S$${amount.toFixed(2)}.`,
            hint:
              ocrSource === 'unavailable'
                ? 'OCR could not read the receipt — verify the receipt image matches the entered amount and date.'
                : largeAmount
                // S$500 is the amount above which review is FORCED. It is not
                // an auto-approval ceiling — this engine has never approved
                // anything — and policies.json was corrected without this copy
                // following it.
                ? 'Above S$500, so the rules send it to a person — check the business justification.'
                : 'No rule matched, so it needs your judgement.',
            createdAt: submittedAt,
            readAt:
              status !== ClaimStatus.Pending ? after(submittedAt, 0, 1) : null,
          },
        });
        notifCount++;

        if (status === ClaimStatus.Endorsed || status === ClaimStatus.Paid) {
          const endorsedAt = after(submittedAt, 1, 3);
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'MANAGER_APPROVAL',
              performedBy: approver.id,
              oldStatus: ClaimStatus.Pending,
              newStatus: ClaimStatus.Endorsed,
              remarks: 'Checked against the receipt and endorsed.',
              createdAt: endorsedAt,
            },
          });
          auditCount++;
          await db.notification.create({
            data: {
              recipientId: employee.id,
              claimId: claim.id,
              kind: 'claim-endorsed',
              title: 'Claim endorsed',
              body: `${approver.name} endorsed your S$${amount.toFixed(2)} ${recipe.category.toLowerCase()} claim. Awaiting finance disbursement.`,
              createdAt: endorsedAt,
              readAt: after(endorsedAt, 0, 1),
            },
          });
          notifCount++;

          if (status === ClaimStatus.Paid) {
            const paidAt = after(endorsedAt, 2, 5);
            await db.auditLog.create({
              data: {
                claimId: claim.id,
                action: 'FINANCE_REIMBURSEMENT',
                performedBy: primaryFinance.id,
                oldStatus: ClaimStatus.Endorsed,
                newStatus: ClaimStatus.Paid,
                remarks: 'Released in a payout run.',
                createdAt: paidAt,
              },
            });
            auditCount++;
            await db.notification.create({
              data: {
                recipientId: employee.id,
                claimId: claim.id,
                kind: 'claim-paid',
                title: 'Reimbursed',
                body: `S$${amount.toFixed(2)} for ${merchant} has been credited to your bank account.`,
                createdAt: paidAt,
                readAt: after(paidAt, 0, 1),
              },
            });
            notifCount++;
          }
        } else if (status === ClaimStatus.Rejected) {
          const rejectedAt = after(submittedAt, 1, 3);
          const reason = pick(REJECTION_REASONS);
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'MANAGER_REJECTION',
              performedBy: approver.id,
              oldStatus: ClaimStatus.Pending,
              newStatus: ClaimStatus.Rejected,
              remarks: reason,
              createdAt: rejectedAt,
            },
          });
          auditCount++;
          await db.notification.create({
            data: {
              recipientId: employee.id,
              claimId: claim.id,
              kind: 'claim-rejected',
              // A rejected claim is closed: the API refuses an edit on
              // anything that is not Pending. "Returned for fix" is what a
              // CORRECTION REQUEST does, and this title sent the submitter off
              // to redo work on a claim nobody would look at again.
              title: 'Claim rejected',
              body: reason,
              createdAt: rejectedAt,
              readAt: after(rejectedAt, 0, 1),
            },
          });
          notifCount++;
        }
      }
    }
  }

  // ---- scenarios ---------------------------------------------------------
  // The volume above is generated, so a run can produce none of a given
  // situation and the demo silently loses a journey — "the user scenarios
  // coverage is not wide enough". These eight are created explicitly, always,
  // on the demo employee so they are one click from the login: every state a
  // claim can be in, and the two journeys that span several.
  const demoEmployee = users.find((u) => u.email === 'demo.employee@claimflow.com')!;
  const demoManager = users.find((u) => u.email === 'demo.manager@claimflow.com')!;
  const demoFinance = users.find((u) => u.email === 'demo.finance@claimflow.com')!;

  let scenarioCount = 0;
  const scenarioClaim = async (opts: {
    merchant: string;
    category: string;
    amount: number;
    gst: number | null;
    ageDays: number;
    status: ClaimStatus;
    withdrawn?: boolean;
    ocrSource?: string;
    details?: Record<string, unknown>;
    /**
     * What the RECEIPT says, when that is deliberately not what was typed.
     *
     * The correction journey needs the two to disagree — that is the whole
     * point of it. The receipt is generated from the claim, so without this the
     * approver's note read "the receipt total reads S$168.00, not S$268.00"
     * beside an image printing 268.00: the one screen where the product proves
     * it catches a mistyped figure was proving the opposite.
     */
    receipt?: { total: number; gst: number | null };
  }) => {
    const index = 9000 + scenarioCount;
    const expenseDate = daysAgo(opts.ageDays);
    const submittedAt = after(expenseDate, 0, 1);
    const receiptUrl = `/test-receipts/seed/${String(index).padStart(4, '0')}.svg`;
    writeSeedReceipt(index, {
      merchant: opts.merchant,
      date: expenseDate.toISOString().slice(0, 10),
      category: opts.category,
      total: opts.receipt ? opts.receipt.total : opts.amount,
      gst: opts.receipt ? opts.receipt.gst : opts.gst,
      reference: `R-${String(index).padStart(4, '0')}`,
    });
    const withdrawnAt = opts.withdrawn ? after(submittedAt, 0, 1) : null;
    const claim = await db.claim.create({
      data: {
        userId: demoEmployee.id,
        amount: opts.amount,
        gstAmount: opts.gst,
        merchant: opts.merchant,
        category: opts.category,
        expenseDate,
        receiptUrl,
        ocrSource: opts.ocrSource ?? 'azure',
        status: opts.status,
        createdAt: submittedAt,
        withdrawn: opts.withdrawn ?? false,
        withdrawnAt,
        details: (opts.details ?? {}) as any,
      },
    });
    scenarioCount++;
    claimCount++;
    return { claim, submittedAt };
  };

  const log = async (
    claimId: number,
    action: string,
    by: number,
    from: ClaimStatus,
    to: ClaimStatus,
    remarks: string,
    at: Date,
  ) => {
    await db.auditLog.create({
      data: {
        claimId,
        action,
        performedBy: by,
        oldStatus: from,
        newStatus: to,
        remarks,
        createdAt: at,
      },
    });
    auditCount++;
  };

  // Every scenario below carries details that SATISFY the policy engine.
  // Three of them did not: two Client Entertainment claims with no
  // businessJustification or clientCompany, and a Training claim whose key was
  // `justification` rather than the `businessJustification` the rule reads. The
  // seed writes straight to the database, so the engine never saw them — and
  // the app, which re-runs the rules in the browser, stamped a red "Blocked"
  // on live pending claims. A blocked claim cannot exist: createClaim refuses
  // one with a 422 before anything is written.

  // 1 — straight through: submitted, recommended, endorsed, paid.
  const settled = await scenarioClaim({
    merchant: 'Grab', category: 'Transport', amount: 18.5, gst: 1.53,
    ageDays: 12, status: ClaimStatus.Paid,
    details: {
      fromLocation: 'Office (Toa Payoh)',
      toLocation: 'Client (Marina Bay)',
      tripPurpose: 'Client meeting',
      travelWindow: 'Morning (06-12)',
    },
  });
  const settledEndorsed = after(settled.submittedAt, 1, 2);
  const settledPaid = after(settledEndorsed, 2, 3);
  await log(settled.claim.id, 'POLICY_RECOMMENDED_APPROVAL', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'auto-approve-transport', settled.submittedAt);
  await log(settled.claim.id, 'MANAGER_APPROVAL', demoManager.id, ClaimStatus.Pending, ClaimStatus.Endorsed, 'Within the transport allowance.', settledEndorsed);
  await log(settled.claim.id, 'FINANCE_REIMBURSEMENT', demoFinance.id, ClaimStatus.Endorsed, ClaimStatus.Paid, 'Paid by PayNow.', settledPaid);

  // 2 — sent back, and still waiting on the submitter. The receipt prints
  //     S$168.00; S$268.00 was typed. That gap is the claim the product makes.
  const awaitingFix = await scenarioClaim({
    merchant: 'Jumbo Seafood', category: 'Client Entertainment', amount: 268.0, gst: 22.13,
    receipt: { total: 168.0, gst: 13.86 },
    ageDays: 3, status: ClaimStatus.Pending,
    details: {
      occasion: 'Client dinner',
      attendees: '4',
      clientCompany: 'Acme Pte Ltd',
      clientContacts: 'Jane Lim, Marcus Wee',
      internalCount: 2,
      externalCount: 2,
      businessJustification:
        'Contract renewal discussion ahead of the FY26 renewal date.',
    },
  });
  const fixAskedAt = after(awaitingFix.submittedAt, 1, 1);
  await log(awaitingFix.claim.id, 'ROUTED_TO_HUMAN', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'default', awaitingFix.submittedAt);
  await log(awaitingFix.claim.id, 'CHANGES_REQUESTED', demoManager.id, ClaimStatus.Pending, ClaimStatus.Pending, 'Amount does not match the receipt.', fixAskedAt);
  await db.claim.update({
    where: { id: awaitingFix.claim.id },
    data: {
      details: {
        ...(awaitingFix.claim.details as any),
        correctionRequest: {
          fields: ['amount'],
          note: 'The receipt total reads S$168.00, not S$268.00.',
          requestedAt: fixAskedAt.toISOString(),
          requestedBy: demoManager.name,
          requestedById: demoManager.id,
        },
      } as any,
    },
  });

  // 3 — the same loop, completed: sent back, fixed, resubmitted, endorsed.
  const corrected = await scenarioClaim({
    merchant: 'NTUC FairPrice', category: 'Office Supplies', amount: 46.6, gst: 3.85,
    ageDays: 20, status: ClaimStatus.Endorsed,
    details: { itemSummary: 'Printer paper, filing boxes' },
  });
  const correctedAsked = after(corrected.submittedAt, 1, 2);
  const correctedFixed = after(correctedAsked, 1, 1);
  const correctedEndorsed = after(correctedFixed, 1, 1);
  await log(corrected.claim.id, 'ROUTED_TO_HUMAN', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'default', corrected.submittedAt);
  await log(corrected.claim.id, 'CHANGES_REQUESTED', demoManager.id, ClaimStatus.Pending, ClaimStatus.Pending, 'GST looked wrong against the total.', correctedAsked);
  await log(corrected.claim.id, 'CORRECTION_SUBMITTED', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'Corrected: GST', correctedFixed);
  await log(corrected.claim.id, 'MANAGER_APPROVAL', demoManager.id, ClaimStatus.Pending, ClaimStatus.Endorsed, 'Corrected and checked.', correctedEndorsed);

  // 4 — refused, with the reason on the record. The claim is complete: it names
  //     a client and gives a justification, so the rules let it through. The
  //     refusal is a judgement about what the evening actually was, which is
  //     exactly the call the engine is not allowed to make.
  const refused = await scenarioClaim({
    merchant: 'Tipsy Collective', category: 'Client Entertainment', amount: 412.0, gst: 34.02,
    ageDays: 25, status: ClaimStatus.Rejected,
    details: {
      occasion: 'Client drinks',
      attendees: '9',
      clientCompany: 'Globex Asia',
      clientContacts: 'Denise Aw',
      internalCount: 8,
      externalCount: 1,
      businessJustification: 'End of quarter drinks with the Globex account team.',
    },
  });
  const refusedAt = after(refused.submittedAt, 1, 2);
  await log(refused.claim.id, 'ROUTED_TO_HUMAN', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'default', refused.submittedAt);
  await log(refused.claim.id, 'MANAGER_REJECTION', demoManager.id, ClaimStatus.Pending, ClaimStatus.Rejected, 'Eight of the nine attendees were our own staff — this is a team night out, not client entertainment.', refusedAt);

  // 5 — withdrawn by the submitter before anyone acted.
  const pulled = await scenarioClaim({
    merchant: 'Daiso', category: 'Office Supplies', amount: 12.0, gst: 0.99,
    ageDays: 30, status: ClaimStatus.Pending, withdrawn: true,
    details: { itemSummary: 'Desk organisers' },
  });
  await log(pulled.claim.id, 'WITHDRAWN_BY_SUBMITTER', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'Bought personally in the end.', after(pulled.submittedAt, 0, 1));

  // 6 — above S$1,000, where IRAS wants a full tax invoice and this product
  //     does not yet capture the supplier GST number or the invoice serial.
  //     A local supplier, deliberately: international air travel is zero-rated
  //     in Singapore, so the previous Singapore Airlines ticket carried 9% GST
  //     it could never have been charged.
  const largeAmount = await scenarioClaim({
    merchant: 'Challenger', category: 'Office Supplies', amount: 1480.0, gst: 122.2,
    ageDays: 6, status: ClaimStatus.Pending,
    details: { itemSummary: 'Two 27-inch monitors and a docking station for the new hire' },
  });
  await log(largeAmount.claim.id, 'ROUTED_TO_HUMAN', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'route-large-amount', largeAmount.submittedAt);

  // 7 — the scan failed, so every field was typed by hand.
  const typed = await scenarioClaim({
    merchant: 'Kopitiam', category: 'Meal', amount: 8.4, gst: null,
    ageDays: 4, status: ClaimStatus.Pending, ocrSource: 'unavailable',
    details: { occasion: 'Solo working meal', attendees: 1, attendeeNotes: 'Working lunch, alone' },
  });
  await log(typed.claim.id, 'RECOMMENDATION_WITHHELD_OCR_UNAVAILABLE', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'auto-approve-small-meal (recommendation withheld: OCR did not read the receipt)', typed.submittedAt);

  // 8 — near the end of the 90-day window, which is the last week it can be
  //     claimed at all.
  const nearlyStale = await scenarioClaim({
    merchant: 'SMU Academy', category: 'Training', amount: 385.27, gst: 31.81,
    ageDays: 86, status: ClaimStatus.Pending,
    details: {
      courseName: 'Singapore SME Tax Workshop',
      provider: 'SMU Academy',
      businessJustification:
        'Data protection and GST filing refresher required for the finance handover.',
    },
  });
  await log(nearlyStale.claim.id, 'ROUTED_TO_HUMAN', demoEmployee.id, ClaimStatus.Pending, ClaimStatus.Pending, 'default', nearlyStale.submittedAt);

  console.log(`  created ${scenarioCount} scenario claims on the demo employee`);

  console.log(`  created ${claimCount} claims`);
  console.log(`  wrote ${auditCount} audit entries`);
  console.log(`  pushed ${notifCount} notifications`);

  console.log('');
  console.log('Seed complete.');
  console.log('');
  console.log(`Demo accounts (password: ${DEMO_PASSWORD}):`);
  console.log('  Employee:  demo.employee@claimflow.com   (Rachel Tan, Sales)');
  console.log('  Manager:   demo.manager@claimflow.com    (Lim Wei Ming, Sales)');
  console.log('  Finance:   demo.finance@claimflow.com    (Priya Kumar)');
  console.log('');
  console.log(
    `Plus ${users.length - 3} other named employees across ${DEPARTMENTS.length} departments.`,
  );
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
