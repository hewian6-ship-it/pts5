import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { User } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || 'peacetech_production_secret_key_jwt_007';

export interface TokenPayload {
  id: string;
  userId: string;
  name: string;
  role: string;
}

export const signToken = (user: User): string => {
  const payload: TokenPayload = {
    id: user.id,
    userId: user.userId,
    name: user.name,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): TokenPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
};

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  // Check cookie or Authorization header
  let token = req.cookies?.['auth_token'];
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }

  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Please login.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid. Please login again.' });
    return;
  }

  req.user = payload;
  next();
};

export const hashPassword = (plain: string): string => {
  return bcrypt.hashSync(plain, 10);
};

export const comparePassword = (plain: string, hash: string): boolean => {
  return bcrypt.compareSync(plain, hash);
};
