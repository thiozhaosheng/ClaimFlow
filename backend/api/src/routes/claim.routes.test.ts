import express from 'express';
import request from 'supertest';
import claimRoutes from './claim.routes';

// Mock authentication
jest.mock('../middleware/auth.middleware', () => ({
  protect: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  },
  restrictTo: () => (req: any, res: any, next: any) => next()
}));

// Mock the models used in the controller
jest.mock('../models/claim.model', () => ({
  createClaim: jest.fn().mockResolvedValue({ id: 'claim-1', status: 'Pending' })
}));
jest.mock('../models/user.model', () => ({
  findById: jest.fn().mockResolvedValue({ id: 'user-123', name: 'Test User', managerId: 'manager-456' }),
  findAll: jest.fn().mockResolvedValue([{ id: 'manager-456', role: 'Manager' }]),
  getDepartmentManager: jest.fn().mockResolvedValue({ id: 'manager-456' })
}));
jest.mock('../models/auditLog.model', () => ({
  createAuditLog: jest.fn().mockResolvedValue({})
}));
jest.mock('../models/notification.model', () => ({
  createNotification: jest.fn().mockResolvedValue({})
}));

// Mock blob storage to avoid errors
jest.mock('../services/blobStorage', () => ({
  generateBlobSasUrl: jest.fn().mockReturnValue('http://test.com/blob')
}));

import * as claimModel from '../models/claim.model';
import * as userModel from '../models/user.model';
import * as auditModel from '../models/auditLog.model';

const app = express();
app.use(express.json());
app.use('/claims', claimRoutes);

describe('Claim Integration Tests (Real Controller, Mocked DB)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /claims should return 400 if receiptUrl is missing', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ category: 'Transport', amount: 10, expenseDate: new Date().toISOString() });
    
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MISSING_RECEIPT');
    expect(res.body.message).toMatch(/receipt must be provided/i);
    expect(claimModel.createClaim).not.toHaveBeenCalled();
  });

  it('POST /claims should successfully create claim if receiptUrl is present', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ 
        category: 'Transport', 
        amount: 10, 
        expenseDate: new Date().toISOString(),
        receiptUrl: '/test-receipts/real-grab.png',
        merchant: 'Grab',
        ocrSource: 'azure'
      });
    
    console.log(res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.claim.id).toBe('claim-1');
    expect(claimModel.createClaim).toHaveBeenCalled();
    expect(auditModel.createAuditLog).toHaveBeenCalled();
  });
});
