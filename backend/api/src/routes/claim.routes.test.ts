/**
 * Integration tests — Claims API (`/claims`)
 * ---------------------------------------------------------------------------
 * These tests drive the REAL Express router, the REAL controller and the REAL
 * policy engine over HTTP using Supertest. Only the outermost edges are
 * replaced: the database models, the auth middleware and Azure Blob Storage.
 * That means a failure here points at genuine wiring problems — route order,
 * middleware chain, status codes, response shape — rather than at a mock.
 *
 * The app under test mounts `helmet()` exactly as `src/index.ts` does in
 * production, so the security-header assertions below reflect what a real
 * client receives.
 *
 * Each test asserts three attributes of the interaction:
 *   1. HTTP status code   2. Response headers   3. Response body structure
 */

import express from 'express';
import helmet from 'helmet';
import request from 'supertest';
import claimRoutes from './claim.routes';

// --- Auth is replaced with a pass-through that injects a known user, so the
// tests exercise the route logic rather than JWT verification. ---
jest.mock('../middleware/auth.middleware', () => ({
  protect: (req: any, _res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com', role: 'Employee' };
    next();
  },
  restrictTo: () => (_req: any, _res: any, next: any) => next(),
}));

// --- Database models are mocked: no live PostgreSQL needed in CI. ---
jest.mock('../models/claim.model', () => ({
  createClaim: jest.fn().mockResolvedValue({
    id: 'claim-1',
    status: 'Pending',
    amount: 10,
    category: 'Transport',
  }),
  // userId matches the user injected by the mocked `protect` above, so the
  // Employee ownership check in getClaimById passes rather than 403-ing.
  findById: jest.fn().mockResolvedValue({
    id: 1,
    userId: 'user-123',
    status: 'Pending',
    amount: 18.5,
    category: 'Transport',
    merchant: 'Grab Singapore',
  }),
}));
jest.mock('../models/user.model', () => ({
  findById: jest.fn().mockResolvedValue({
    id: 'user-123',
    name: 'Test User',
    managerId: 'manager-456',
  }),
  findAll: jest.fn().mockResolvedValue([{ id: 'manager-456', role: 'Manager' }]),
  getDepartmentManager: jest.fn().mockResolvedValue({ id: 'manager-456' }),
}));
jest.mock('../models/auditLog.model', () => ({
  createAuditLog: jest.fn().mockResolvedValue({}),
}));
jest.mock('../models/notification.model', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

// --- Azure Blob Storage stubbed out so no cloud call is made. ---
jest.mock('../services/blobStorage', () => ({
  generateBlobSasUrl: jest.fn().mockReturnValue('http://test.com/blob'),
}));

import * as claimModel from '../models/claim.model';
import * as auditModel from '../models/auditLog.model';

// Build an app that mirrors the production middleware stack.
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json());
app.use('/claims', claimRoutes);

/** A submission that satisfies every policy rule. */
const validClaim = {
  category: 'Transport',
  amount: 10,
  expenseDate: new Date().toISOString(),
  receiptUrl: '/test-receipts/real-grab.png',
  merchant: 'Grab',
  ocrSource: 'azure',
};

describe('Claims API integration (real router + controller + policy engine)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /claims', () => {
    it('creates a claim (201) and returns the claim plus its policy verdict', async () => {
      // Arrange / Act
      const res = await request(app).post('/claims').send(validClaim);

      // Assert — status
      expect(res.status).toBe(201);
      // Assert — headers (JSON content type + helmet security headers)
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers).not.toHaveProperty('x-powered-by');
      // Assert — body structure
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('data.claim.id', 'claim-1');
      expect(res.body).toHaveProperty('data.claim.status', 'Pending');
      expect(res.body.policy).toEqual(
        expect.objectContaining({
          outcome: expect.any(String),
          ruleId: expect.any(String),
          message: expect.any(String),
        }),
      );
      // Assert — persistence and the audit trail both fired
      expect(claimModel.createClaim).toHaveBeenCalledTimes(1);
      expect(auditModel.createAuditLog).toHaveBeenCalled();
    });

  });

  /**
   * Single-resource retrieval — the test case specified in Part 2 of the
   * capstone brief.
   *
   * The brief words that requirement against the Swag Store teaching project
   * ("GET /products/1 ... assert the body contains the name 'Premium Hoodie'"),
   * which has no counterpart in ClaimFlow. GET /claims/:id is the same
   * contract — fetch one resource by id, assert 200, assert a named value in
   * the body — so it is tested here in those terms:
   *
   *   GET /products/1        ->  GET /claims/1
   *   status is 200 OK       ->  status is 200 OK
   *   body has "Premium Hoodie" -> body has merchant "Grab Singapore"
   */
  describe('GET /claims/:id', () => {
    it('returns a single claim (200) whose body carries the merchant name', async () => {
      // Arrange / Act — request the resource by id
      const res = await request(app).get('/claims/1');

      // Assert — status code is 200 OK
      expect(res.status).toBe(200);

      // Assert — headers
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['x-content-type-options']).toBe('nosniff');

      // Assert — the response body contains the expected name
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body.data.claim).toEqual(
        expect.objectContaining({
          id: 1,
          merchant: 'Grab Singapore',
          category: 'Transport',
          amount: 18.5,
        }),
      );

      // Assert — the id from the URL was the one looked up
      expect(claimModel.findById).toHaveBeenCalledWith(1);
    });
  });
});
