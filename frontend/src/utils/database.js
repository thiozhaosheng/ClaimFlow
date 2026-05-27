import { getIsoDate, getTimeString } from "./helpers.js";

export const defaultInitialRecords = [
  {
    id: "CLM-001",
    employee: "Sarah Johnson",
    date: "2026-05-11",
    time: "09:23 AM",
    type: "Meal",
    department: "Sales",
    amount: 145.5,
    status: "Pending",
    actor: "Sarah Johnson",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 1289",
  },
  {
    id: "CLM-002",
    employee: "Michael Chen",
    date: "2026-05-09",
    time: "02:15 PM",
    type: "Travel",
    department: "Engineering",
    amount: 450.0,
    status: "Endorsed",
    actor: "Michael Chen",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 4589",
  },
  {
    id: "CLM-002",
    employee: "Michael Chen",
    date: "2026-05-10",
    time: "10:30 AM",
    type: "Travel",
    department: "Engineering",
    amount: 450.0,
    status: "Endorsed",
    actor: "Lisa Wang",
    role: "Approving Officer",
    action: "Endorsed by approving officer",
    bank: "**** 4589",
  },
  {
    id: "CLM-003",
    employee: "Emily Davis",
    date: "2026-05-06",
    time: "11:45 AM",
    type: "Medical",
    department: "HR",
    amount: 85.0,
    status: "Paid",
    actor: "Emily Davis",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 9012",
  },
  {
    id: "CLM-003",
    employee: "Emily Davis",
    date: "2026-05-07",
    time: "09:20 AM",
    type: "Medical",
    department: "HR",
    amount: 85.0,
    status: "Paid",
    actor: "David Park",
    role: "Approving Officer",
    action: "Endorsed by approving officer",
    bank: "**** 9012",
  },
  {
    id: "CLM-003",
    employee: "Emily Davis",
    date: "2026-05-08",
    time: "03:15 PM",
    type: "Medical",
    department: "HR",
    amount: 85.0,
    status: "Paid",
    actor: "Finance Admin",
    role: "Finance Admin",
    action: "Marked as paid",
    bank: "**** 9012",
  },
  {
    id: "CLM-004",
    employee: "Alex Rodriguez",
    date: "2026-05-13",
    time: "08:30 AM",
    type: "Meal",
    department: "Sales",
    amount: 120.0,
    status: "Pending",
    actor: "Alex Rodriguez",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 3341",
  },
  {
    id: "CLM-005",
    employee: "Jennifer Martinez",
    date: "2026-05-14",
    time: "10:15 AM",
    type: "Training",
    department: "Sales",
    amount: 75.0,
    status: "Pending",
    actor: "Jennifer Martinez",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 7762",
  },
  {
    id: "CLM-006",
    employee: "Robert Kim",
    date: "2026-05-13",
    time: "04:30 PM",
    type: "Travel",
    department: "Sales",
    amount: 45.0,
    status: "Pending",
    actor: "Robert Kim",
    role: "Employee",
    action: "Claim submitted",
    bank: "**** 5521",
  },
];

export function loadDatabaseState() {
  const savedDb = localStorage.getItem("claimflow_db");
  return savedDb ? JSON.parse(savedDb) : [...defaultInitialRecords];
}

export function saveDatabaseState(claimsDb) {
  localStorage.setItem("claimflow_db", JSON.stringify(claimsDb));
}

export function getLatestClaimsMap(claimsDb) {
  const map = {};
  claimsDb.forEach((rec) => {
    if (!map[rec.id]) {
      map[rec.id] = rec;
    }
  });
  return map;
}

export function getNextClaimId(claimsDb) {
  const max = claimsDb.reduce((maxVal, entry) => {
    const num = parseInt(entry.id.replace("CLM-", ""));
    return num > maxVal ? num : maxVal;
  }, 0);
  return `CLM-${String(max + 1).padStart(3, "0")}`;
}

export function getEmployeeNameFromEmail(email) {
  const lower = email.toLowerCase();
  if (lower.includes("sarah")) return "Sarah Johnson";
  if (lower.includes("robert")) return "Robert Kim";
  if (lower.includes("michael")) return "Michael Chen";
  return "Jennifer Martinez";
}

export function createClaimRecord({ title, date, category, amount, email }) {
  return {
    id: getNextClaimId(loadDatabaseState()),
    employee: getEmployeeNameFromEmail(email),
    date: date,
    time: generateTimestamp(),
    type: category,
    department: "Sales",
    amount: amount,
    status: "Pending",
    actor: getEmployeeNameFromEmail(email),
    role: "Employee",
    action: "Claim submitted",
    bank: "**** " + Math.floor(1000 + Math.random() * 9000),
  };
}

function generateTimestamp() {
  const rightNow = new Date();
  let hr = rightNow.getHours();
  const min = String(rightNow.getMinutes()).padStart(2, "0");
  const period = hr >= 12 ? "PM" : "AM";
  hr = hr % 12 || 12;
  return `${String(hr).padStart(2, "0")}:${min} ${period}`;
}
