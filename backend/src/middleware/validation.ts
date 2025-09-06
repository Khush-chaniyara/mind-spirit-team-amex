import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { IApiResponse } from '../types';

// Handle validation errors
export const handleValidationErrors = (
  req: Request,
  res: Response<IApiResponse>,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: errorMessages.join('. ')
    });
    return;
  }
  
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('userType')
    .isIn(['donor', 'patient', 'hospital'])
    .withMessage('User type must be donor, patient, or hospital'),
  
  body('phone')
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be exactly 6 digits'),
  
  body('bloodGroup')
    .optional()
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),
  
  body('age')
    .optional()
    .isInt({ min: 18, max: 65 })
    .withMessage('Age must be between 18 and 65'),
  
  body('weight')
    .optional()
    .isFloat({ min: 50, max: 150 })
    .withMessage('Weight must be between 50 and 150 kg'),
  
  handleValidationErrors
];

// Blood request validation
export const validateBloodRequest = [
  body('patientName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Patient name must be between 2 and 100 characters'),
  
  body('bloodGroup')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),
  
  body('urgency')
    .isIn(['critical', 'urgent', 'normal'])
    .withMessage('Urgency must be critical, urgent, or normal'),
  
  body('hospital')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Hospital name must be between 2 and 200 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('pincode')
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be exactly 6 digits'),
  
  body('unitsNeeded')
    .isInt({ min: 1, max: 10 })
    .withMessage('Units needed must be between 1 and 10'),
  
  body('contactPhone')
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid contact phone number'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  handleValidationErrors
];

// Donation record validation
export const validateDonationRecord = [
  body('bloodGroup')
    .isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Invalid blood group'),
  
  body('hospital')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Hospital name must be between 2 and 200 characters'),
  
  body('city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('unitsContributed')
    .isInt({ min: 1, max: 2 })
    .withMessage('Units contributed must be between 1 and 2'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName: string) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} ID format`),
  
  handleValidationErrors
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sort')
    .optional()
    .isString()
    .withMessage('Sort must be a string'),
  
  query('order')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Order must be asc or desc'),
  
  handleValidationErrors
];

// Search validation
export const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters'),
  
  query('city')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  query('pincode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('Pincode must be exactly 6 digits'),
  
  handleValidationErrors
];
