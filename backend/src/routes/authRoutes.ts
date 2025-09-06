import { Router } from 'express';
import {
  googleLogin,
  googleCallback,
  handleGoogleAuth,
  refreshToken,
  register,
  login,
  getProfile,
  updateProfile,
  logout
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { catchAsync } from '../middleware/errorHandler';
import { validateUserRegistration } from '../middleware/validation';

const router = Router();

// Google OAuth routes
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback, handleGoogleAuth);

// Token management
router.post('/refresh', refreshToken);

// Manual authentication routes
router.post('/register', validateUserRegistration, register);
router.post('/login', login);

// Protected routes
router.use(catchAsync(authenticate)); // All routes below require authentication

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/logout', logout);

export default router;
