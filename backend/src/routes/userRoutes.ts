import { Router } from 'express';
import {
  getUsers,
  getUser,
  updateUserAvailability,
  getAvailableDonors,
  getUserStats,
  searchUsers,
  getUserDonationHistory,
  getUserContributionSummary,
  deleteUserAccount
} from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { 
  validateObjectId, 
  validatePagination, 
  validateSearch 
} from '../middleware/validation';

const router = Router();

// Public routes (no authentication required)
router.get('/donors/available', getAvailableDonors);
router.get('/stats', getUserStats);
router.get('/search', validateSearch, searchUsers);

// Protected routes (authentication required)
router.use(authenticate);

// User management routes
router.get('/', validatePagination, getUsers);
router.get('/:id', validateObjectId('id'), getUser);
router.put('/availability', updateUserAvailability);
router.get('/:id/donations', validateObjectId('id'), getUserDonationHistory);
router.get('/:id/contributions', validateObjectId('id'), getUserContributionSummary);
router.delete('/account', deleteUserAccount);

export default router;
