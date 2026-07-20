import { evaluateClaim } from './policyEngine';

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(JSON.stringify({
    version: "1.0",
    currency: "SGD",
    rules: [
      {
        id: "auto-approve-small-transport",
        when: [
          { field: "category", op: "==", value: "Transport" },
          { field: "amount", op: "<=", value: 50 },
          { field: "details.ocrIncomplete", op: "missing" }
        ],
        then: "auto-approve",
        message: "Transport claims under 50 auto-approve."
      },
      {
        id: "block-disallowed-category",
        when: [
          { field: "category", op: "in", value: ["Medical (non-statutory)", "Club Subscription"] }
        ],
        then: "block",
        message: "This category is not claimable."
      }
    ]
  }))
}));

describe('policyEngine', () => {
  it('should auto-approve a valid small transport claim', () => {
    const result = evaluateClaim({
      category: 'Transport',
      amount: 40,
      receiptUrl: null,
      expenseDate: new Date(),
    });

    expect(result.outcome).toBe('auto-approve');
    expect(result.ruleId).toBe('auto-approve-small-transport');
  });

  it('should block disallowed categories', () => {
    const result = evaluateClaim({
      category: 'Club Subscription',
      amount: 100,
      receiptUrl: null,
      expenseDate: new Date(),
    });

    expect(result.outcome).toBe('block');
    expect(result.ruleId).toBe('block-disallowed-category');
  });

  it('should route to human if no rules match', () => {
    const result = evaluateClaim({
      category: 'Transport',
      amount: 100, // over 50
      receiptUrl: null,
      expenseDate: new Date(),
    });

    expect(result.outcome).toBe('route-to-human');
    expect(result.ruleId).toBe('default');
  });
});
