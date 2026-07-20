import express from 'express';
import request from 'supertest';
import claimRoutes from './claim.routes';

jest.mock('../middleware/auth.middleware', () => ({
  protect: (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', email: 'test@example.com' };
    next();
  },
  restrictTo: () => (req: any, res: any, next: any) => next()
}));

// Mock the claim controller
jest.mock('../controllers/claim.controller', () => ({
  createClaim: (req: any, res: any) => res.status(201).json({ id: 'claim-1' }),
  getMyClaims: (req: any, res: any) => res.status(200).json([]),
  getClaimById: (req: any, res: any) => res.status(200).json({}),
  editClaim: (req: any, res: any) => res.status(200).json({}),
  withdrawClaim: (req: any, res: any) => res.status(200).json({}),
  parseReceiptUpload: (req: any, res: any) => res.status(200).json({ merchant: 'Grab' }),
  getReceiptViewUrl: (req: any, res: any) => res.status(200).json({ url: 'http://test.com' }),
  getAllClaims: (req: any, res: any) => res.status(200).json([]),
  getClaimActivity: (req: any, res: any) => res.status(200).json([]),
  addComment: (req: any, res: any) => res.status(201).json({}),
}));

const app = express();
app.use(express.json());
app.use('/claims', claimRoutes);

describe('Claim Routes Integration', () => {
  it('GET /claims/my should return 200', async () => {
    const res = await request(app).get('/claims/my');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /claims should return 201', async () => {
    const res = await request(app)
      .post('/claims')
      .send({ category: 'Transport', amount: 10 });
    
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('claim-1');
  });
});
