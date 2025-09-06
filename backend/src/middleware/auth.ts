import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import User, { IUserDocument } from '../models/User';
import { IApiResponse } from '../types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}

export interface AuthRequest extends Request {
  user?: IUserDocument;
}

// Generate JWT token
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  } as jwt.SignOptions);
};

// Generate refresh token
export const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ userId }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  } as jwt.SignOptions);
};

// Verify JWT token
export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, config.jwtSecret) as { userId: string };
  } catch (error) {
    return null;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret) as { userId: string };
  } catch (error) {
    return null;
  }
};

// Authentication middleware
export const authenticate = async (
  req: AuthRequest,
  res: Response<IApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const decoded = verifyToken(token);

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token.',
      });
      return;
    }

    const user = await User.findById(decoded.userId).select('-googleId');
    
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.',
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      if (decoded) {
        const user = await User.findById(decoded.userId).select('-googleId');
        if (user) {
          req.user = user;
        }
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Authorization middleware for specific user types
export const authorize = (...userTypes: string[]) => {
  return (req: AuthRequest, res: Response<IApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
      return;
    }

    if (!userTypes.includes(req.user.userType)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions.',
      });
      return;
    }

    next();
  };
};

// Middleware to check if user is donor
export const requireDonor = authorize('donor');

// Middleware to check if user is hospital or patient
export const requireHospitalOrPatient = authorize('hospital', 'patient');

// Middleware to check if user can donate
export const requireCanDonate = async (
  req: AuthRequest,
  res: Response<IApiResponse>,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
    return;
  }

  if (req.user.userType !== 'donor') {
    res.status(403).json({
      success: false,
      message: 'Only donors can perform this action.',
    });
    return;
  }

  // Check if user can donate (90 days gap)
  if (req.user.lastDonation) {
    const daysSinceLastDonation = Math.floor(
      (Date.now() - req.user.lastDonation.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastDonation < 90) {
      res.status(400).json({
        success: false,
        message: 'You must wait 90 days between donations.',
      });
      return;
    }
  }

  next();
};
