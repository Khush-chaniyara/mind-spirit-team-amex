import { Router } from 'express';
import {
  createBloodRequest,
  getBloodRequests,
  getBloodRequest,
  updateBloodRequest,
  deleteBloodRequest,
  fulfillRequest,
  getUserBloodRequests,
  getNearbyDonors,
  getBloodRequestStats,
  searchBloodRequests
} from '../controllers/bloodRequestController';
import { authenticate, requireHospitalOrPatient } from '../middleware/auth';
import { 
  validateBloodRequest, 
  validateObjectId, 
  validatePagination, 
  validateSearch 
} from '../middleware/validation';

const router = Router();

// Public routes (no authentication required)
router.get('/', validatePagination, getBloodRequests);
router.get('/search', validateSearch, searchBloodRequests);
router.get('/stats', getBloodRequestStats);
router.get('/:id', validateObjectId('id'), getBloodRequest);
router.get('/:id/donors', validateObjectId('id'), getNearbyDonors);

// Protected routes (authentication required)
router.use(authenticate);

// Routes that require hospital or patient role
router.post('/', requireHospitalOrPatient, validateBloodRequest, createBloodRequest);
router.get('/user/my-requests', validatePagination, getUserBloodRequests);

// Routes that require ownership or specific permissions
router.put('/:id', validateObjectId('id'), updateBloodRequest);
router.delete('/:id', validateObjectId('id'), deleteBloodRequest);
router.patch('/:id/fulfill', validateObjectId('id'), fulfillRequest);

export default router;
