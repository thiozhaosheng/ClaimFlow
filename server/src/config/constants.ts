import dotenv from 'dotenv';

const result = dotenv.config();
if (result.error) {
  console.error("Warning: .env file not found or could not be loaded");
}

export const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_this';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost/dbname';
export const PORT = process.env.PORT || 3000;
export const HITPAY_API_KEY = process.env.HITPAY_API_KEY || '';
export const HITPAY_SALT = process.env.HITPAY_SALT || '';