import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Email must be a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
