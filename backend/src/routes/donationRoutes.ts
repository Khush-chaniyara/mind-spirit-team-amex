import { Router } from 'express';
import {
  createDonationRecord,
  getDonationRecords,
  getDonationRecord,
  updateDonationRecord,
  completeDonation,
  getUserDonationRecords,
  getDonationStats,
  getTopDonors,
  getDonationsByBloodGroup,
  getUserDonationSummary,
  cancelDonation
} from '../controllers/donationController';
import { authenticate, requireDonor, requireCanDonate } from '../middleware/auth';
import { 
  validateDonationRecord, 
  validateObjectId, 
  validatePagination 
} from '../middleware/validation';

const router = Router();

// Public routes (no authentication required)
router.get('/stats', getDonationStats);
router.get('/leaderboard', getTopDonors);
router.get('/blood-groups', getDonationsByBloodGroup);

// Protected routes (authentication required)
router.use(authenticate);

// Routes that require donor role
router.post('/', requireDonor, requireCanDonate, validateDonationRecord, createDonationRecord);
router.get('/user/my-donations', validatePagination, getUserDonationRecords);
router.get('/user/summary', getUserDonationSummary);

// Routes that require ownership
router.get('/:id', validateObjectId('id'), getDonationRecord);
router.put('/:id', validateObjectId('id'), updateDonationRecord);
router.patch('/:id/complete', validateObjectId('id'), completeDonation);
router.patch('/:id/cancel', validateObjectId('id'), cancelDonation);

// Admin routes (for getting all donations)
router.get('/', validatePagination, getDonationRecords);

export default router;
