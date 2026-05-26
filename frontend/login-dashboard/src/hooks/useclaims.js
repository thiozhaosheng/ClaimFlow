import { useState, useCallback } from "react";
import {
  loadDatabaseState,
  saveDatabaseState,
  getLatestClaimsMap,
  getNextClaimId,
  getEmployeeNameFromEmail,
} from "../utils/database.js";
import { getIsoDate, getTimeString } from "../utils/helpers.js";

export function useClaims() {
  const [claimsDb, setClaimsDb] = useState(() => loadDatabaseState());

  const persist = useCallback((newDb) => {
    setClaimsDb(newDb);
    saveDatabaseState(newDb);
  }, []);

  const submitClaim = useCallback(
    ({ title, date, category, amount, email }) => {
      const newRecord = {
        id: getNextClaimId(claimsDb),
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
      const updated = [newRecord, ...claimsDb];
      persist(updated);
      return newRecord;
    },
    [claimsDb, persist],
  );

  const updateClaimStatus = useCallback(
    (claimId, newStatus, actorName = "Lisa Wang", reason = null) => {
      const match = claimsDb.find((c) => c.id === claimId);
      if (!match) return;

      let action;
      if (newStatus === "Endorsed") {
        action = "Endorsed by approving officer";
      } else if (newStatus === "Rejected") {
        action = reason
          ? `Rejected by approving officer: ${reason}`
          : "Rejected by approving officer";
      } else {
        action = `Status changed to ${newStatus}`;
      }

      const historyRecord = {
        ...match,
        date: getIsoDate(),
        time: getTimeString(),
        status: newStatus,
        action,
        actor: actorName,
        role: "Approving Officer",
        reason: reason || undefined,
      };

      const updated = claimsDb.map((c) =>
        c.id === claimId ? { ...c, status: newStatus } : c,
      );
      updated.unshift(historyRecord);
      persist(updated);
    },
    [claimsDb, persist],
  );

  const batchMarkAsPaid = useCallback(
    (selectedIds) => {
      if (selectedIds.size === 0) return;

      const updated = [...claimsDb];

      selectedIds.forEach((id) => {
        const match = updated.find((c) => c.id === id);
        if (match) {
          const auditLog = {
            ...match,
            date: getIsoDate(),
            time: getTimeString(),
            status: "Paid",
            action: "Marked as paid",
            actor: "Finance Admin",
            role: "Finance Admin",
          };
          updated.forEach((c) => {
            if (c.id === id) c.status = "Paid";
          });
          updated.unshift(auditLog);
        }
      });

      persist(updated);
    },
    [claimsDb, persist],
  );

  const latestMap = getLatestClaimsMap(claimsDb);

  return {
    claimsDb,
    latestMap,
    submitClaim,
    updateClaimStatus,
    batchMarkAsPaid,
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
