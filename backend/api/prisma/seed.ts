import { PrismaClient, Role, ClaimStatus } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const db = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'claimflow-demo';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
const avatarFor = (email: string) =>
  `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(randInt(8, 19), randInt(0, 59), 0, 0);
  return d;
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
      // The receipt has to belong to the claim it is attached to. This picked
      // one of the three photographs at random, so a Grab ride showed an NTUC
      // FairPrice till slip and a supermarket run showed a taxi receipt — in a
      // product whose review step asks the approver to compare the merchant on
      // the claim against the merchant on the receipt. Two thirds of the demo
      // data failed that comparison on sight.
      //
      // What each photograph actually says:
      //   real-grab.png      GrabTaxi Holdings, SGD 24.50, GST 2.02, 18 Jul
      //   real-paynow.png    PayNow to Jumbo Seafood (Riverside), SGD 135.00
      //   real-fairprice.png NTUC FairPrice, SGD 46.60, GST 3.85
      //
      // Matching by category keeps the merchant plausible. The printed total
      // still will not equal every claim's amount — there are three images and
      // 140-odd claims — so an approver checking amounts closely will find
      // those differ. Fixing that needs either one receipt per claim or a
      // dataset with three distinct amounts, which is a trade against the
      // spend charts and a decision to make deliberately.
      const receiptForCategory: Record<string, string> = {
        Transport: '/test-receipts/real-grab.png',
        Meal: '/test-receipts/real-paynow.png',
        'Client Entertainment': '/test-receipts/real-paynow.png',
        'Office Supplies': '/test-receipts/real-fairprice.png',
      };
      const receiptUrl =
        receiptForCategory[recipe.category] ?? '/test-receipts/real-fairprice.png';
      
      // 4% had OCR fail (Azure unavailable / manual entry)
      const ocrSource = chance(0.04) ? 'unavailable' : 'azure';
      // 9% GST captured (since GST rate 9% in SG; we record gst amount when known)
      const gstAmount = chance(0.65) ? round2(amount * 0.09 / 1.09) : null;

      // Decide final status using the same logic as production:
      // - block conditions never make it to the DB (we just skip them)
      // - auto-approve conditions become Endorsed (and sometimes Paid)
      // - everything else is Pending, then evolves into Endorsed/Rejected/Paid based on age

      const blocked = chance(0.05); // 5% chance of being withdrawn
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
            withdrawn: true,
            withdrawnAt: daysAgo(Math.max(0, ageDays - 1)),
          },
        });
        await db.auditLog.create({
          data: {
            claimId: claim.id,
            action: 'WITHDRAWN_BY_SUBMITTER',
            performedBy: employee.id,
            oldStatus: ClaimStatus.Pending,
            newStatus: ClaimStatus.Pending,
            remarks: 'Submitter withdrew after seeing the missing-receipt block.',
            createdAt: daysAgo(Math.max(0, ageDays - 1)),
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
            createdAt: daysAgo(ageDays),
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
            createdAt: daysAgo(ageDays),
          },
        });
        notifCount++;

        // A recommendation is not an endorsement: something an officer did has
        // to stand between Pending and Endorsed, or the trail cannot explain
        // how the claim moved.
        if (status === ClaimStatus.Endorsed || status === ClaimStatus.Paid) {
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'MANAGER_APPROVAL',
              performedBy: approver.id,
              oldStatus: ClaimStatus.Pending,
              newStatus: ClaimStatus.Endorsed,
              remarks: 'Recommended by policy, checked and endorsed.',
              createdAt: daysAgo(Math.max(0, ageDays - randInt(1, 3))),
            },
          });
          auditCount++;
        }

        if (status === ClaimStatus.Paid) {
          const paidAge = Math.max(0, ageDays - randInt(3, 6));
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'FINANCE_REIMBURSEMENT',
              performedBy: primaryFinance.id,
              oldStatus: ClaimStatus.Endorsed,
              newStatus: ClaimStatus.Paid,
              remarks: 'Batch payout — approved claims included.',
              createdAt: daysAgo(paidAge),
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
              createdAt: daysAgo(paidAge),
              readAt: paidAge > 2 ? daysAgo(paidAge - 1) : null,
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
            createdAt: daysAgo(ageDays),
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
                ? `Above S$500 auto-approve ceiling — verify business justification.`
                : 'Did not match any auto-approve rule.',
            createdAt: daysAgo(ageDays),
            readAt:
              ageDays > 1 && status !== ClaimStatus.Pending
                ? daysAgo(Math.max(0, ageDays - 1))
                : null,
          },
        });
        notifCount++;

        if (status === ClaimStatus.Endorsed || status === ClaimStatus.Paid) {
          const endorsedAge = Math.max(0, ageDays - randInt(1, 3));
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'MANAGER_APPROVAL',
              performedBy: approver.id,
              oldStatus: ClaimStatus.Pending,
              newStatus: ClaimStatus.Endorsed,
              remarks: '',
              createdAt: daysAgo(endorsedAge),
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
              createdAt: daysAgo(endorsedAge),
              readAt: endorsedAge > 2 ? daysAgo(endorsedAge - 1) : null,
            },
          });
          notifCount++;

          if (status === ClaimStatus.Paid) {
            const paidAge = Math.max(0, endorsedAge - randInt(2, 5));
            await db.auditLog.create({
              data: {
                claimId: claim.id,
                action: 'FINANCE_REIMBURSEMENT',
                performedBy: primaryFinance.id,
                oldStatus: ClaimStatus.Endorsed,
                newStatus: ClaimStatus.Paid,
                remarks: '',
                createdAt: daysAgo(paidAge),
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
                createdAt: daysAgo(paidAge),
                readAt: paidAge > 2 ? daysAgo(paidAge - 1) : null,
              },
            });
            notifCount++;
          }
        } else if (status === ClaimStatus.Rejected) {
          const rejectedAge = Math.max(0, ageDays - randInt(1, 3));
          const reason = pick(REJECTION_REASONS);
          await db.auditLog.create({
            data: {
              claimId: claim.id,
              action: 'MANAGER_REJECTION',
              performedBy: approver.id,
              oldStatus: ClaimStatus.Pending,
              newStatus: ClaimStatus.Rejected,
              remarks: reason,
              createdAt: daysAgo(rejectedAge),
            },
          });
          auditCount++;
          await db.notification.create({
            data: {
              recipientId: employee.id,
              claimId: claim.id,
              kind: 'claim-rejected',
              title: 'Claim returned for fix',
              body: reason,
              createdAt: daysAgo(rejectedAge),
              readAt: rejectedAge > 2 ? daysAgo(rejectedAge - 1) : null,
            },
          });
          notifCount++;
        }
      }
    }
  }

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
    `Plus ${users.length - 3} other named employees across ${DEPARTMENTS.length} departments. Avatars served by pravatar.cc.`,
  );
}

main()
  .catch((e) => {
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
