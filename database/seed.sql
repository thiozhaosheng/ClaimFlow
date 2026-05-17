INSERT INTO users (name, email, password_hash, role, department)
VALUES
('Employee User', 'employee@claimflow.com', 'hashed_password_here', 'employee', 'Sales'),
('Manager User', 'manager@claimflow.com', 'hashed_password_here', 'manager', 'Sales'),
('Finance Admin', 'finance@claimflow.com', 'hashed_password_here', 'finance_admin', 'Finance');


INSERT INTO claims (
    user_id,
    amount,
    category,
    expense_date,
    receipt_url,
    status
)
VALUES
(
    (SELECT id FROM users WHERE email = 'employee@claimflow.com'),
    25.50,
    'Transport',
    '2026-05-10',
    '/receipts/receipt-transport.png',
    'pending'
),
(
    (SELECT id FROM users WHERE email = 'employee@claimflow.com'),
    80.00,
    'Meals',
    '2026-05-11',
    '/receipts/receipt-meals.png',
    'endorsed'
),
(
    (SELECT id FROM users WHERE email = 'employee@claimflow.com'),
    120.00,
    'Office Supplies',
    '2026-05-12',
    '/receipts/receipt-office-supplies.png',
    'paid'
),
(
    (SELECT id FROM users WHERE email = 'employee@claimflow.com'),
    45.00,
    'Transport',
    '2026-05-13',
    '/receipts/receipt-taxi.png',
    'rejected'
);


INSERT INTO audit_logs (
    claim_id,
    action,
    performed_by,
    old_status,
    new_status,
    remarks
)
VALUES
(
    1,
    'Claim Submitted',
    (SELECT id FROM users WHERE email = 'employee@claimflow.com'),
    NULL,
    'pending',
    'Claim submitted by employee'
),
(
    2,
    'Claim Endorsed',
    (SELECT id FROM users WHERE email = 'manager@claimflow.com'),
    'pending',
    'endorsed',
    'Approved by manager'
),
(
    3,
    'Claim Paid',
    (SELECT id FROM users WHERE email = 'finance@claimflow.com'),
    'endorsed',
    'paid',
    'Reimbursement completed'
),
(
    4,
    'Claim Rejected',
    (SELECT id FROM users WHERE email = 'manager@claimflow.com'),
    'pending',
    'rejected',
    'Receipt amount unclear'
);