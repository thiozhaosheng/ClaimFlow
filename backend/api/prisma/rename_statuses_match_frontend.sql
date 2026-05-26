-- Rename ClaimStatus + Role enum values so the database matches the frontend vocabulary.
-- Data-preserving: existing rows are mapped to their new equivalents in a CASE block.
--
-- Mapping:
--   Submitted        -> Pending
--   Pending Review   -> Pending   (PendingReview enum value, @map'd to "Pending Review")
--   Approved         -> Endorsed
--   Reimbursed       -> Paid
--   Rejected         -> Rejected  (unchanged)
--   Paid             -> Paid      (unchanged)
--
-- Role.FinanceAdmin previously @map'd to "Finance Admin" in the DB; rename the value
-- so the DB string matches the Prisma enum name (no more space).

BEGIN;

CREATE TYPE "ClaimStatus_new" AS ENUM ('Pending', 'Endorsed', 'Rejected', 'Paid');

ALTER TABLE "Claim" ALTER COLUMN status DROP DEFAULT;

ALTER TABLE "Claim"
  ALTER COLUMN status TYPE "ClaimStatus_new" USING (
    CASE status::text
      WHEN 'Submitted'      THEN 'Pending'::"ClaimStatus_new"
      WHEN 'Pending Review' THEN 'Pending'::"ClaimStatus_new"
      WHEN 'Approved'       THEN 'Endorsed'::"ClaimStatus_new"
      WHEN 'Reimbursed'     THEN 'Paid'::"ClaimStatus_new"
      WHEN 'Rejected'       THEN 'Rejected'::"ClaimStatus_new"
      WHEN 'Paid'           THEN 'Paid'::"ClaimStatus_new"
    END
  );

ALTER TABLE "AuditLog"
  ALTER COLUMN old_status TYPE "ClaimStatus_new" USING (
    CASE old_status::text
      WHEN 'Submitted'      THEN 'Pending'::"ClaimStatus_new"
      WHEN 'Pending Review' THEN 'Pending'::"ClaimStatus_new"
      WHEN 'Approved'       THEN 'Endorsed'::"ClaimStatus_new"
      WHEN 'Reimbursed'     THEN 'Paid'::"ClaimStatus_new"
      WHEN 'Rejected'       THEN 'Rejected'::"ClaimStatus_new"
      WHEN 'Paid'           THEN 'Paid'::"ClaimStatus_new"
    END
  );

ALTER TABLE "AuditLog"
  ALTER COLUMN new_status TYPE "ClaimStatus_new" USING (
    CASE new_status::text
      WHEN 'Submitted'      THEN 'Pending'::"ClaimStatus_new"
      WHEN 'Pending Review' THEN 'Pending'::"ClaimStatus_new"
      WHEN 'Approved'       THEN 'Endorsed'::"ClaimStatus_new"
      WHEN 'Reimbursed'     THEN 'Paid'::"ClaimStatus_new"
      WHEN 'Rejected'       THEN 'Rejected'::"ClaimStatus_new"
      WHEN 'Paid'           THEN 'Paid'::"ClaimStatus_new"
    END
  );

DROP TYPE "ClaimStatus";
ALTER TYPE "ClaimStatus_new" RENAME TO "ClaimStatus";

ALTER TABLE "Claim" ALTER COLUMN status SET DEFAULT 'Pending';

ALTER TYPE "Role" RENAME VALUE 'Finance Admin' TO 'FinanceAdmin';

COMMIT;
