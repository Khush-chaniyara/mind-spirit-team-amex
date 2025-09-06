import { Request, Response } from 'express';
import User, { IUserDocument } from '../models/User';
import DonationRecord from '../models/DonationRecord';
import { IApiResponse, IPaginatedResponse, BloodGroup } from '../types';
import { catchAsync } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Get all users with filtering and pagination
export const getUsers = catchAsync(async (req: Request, res: Response<IApiResponse<IPaginatedResponse<IUserDocument>>>) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Build filter query
  const filter: any = {};
  
  if (req.query.userType) {
    filter.userType = req.query.userType;
  }
  
  if (req.query.bloodGroup) {
    filter.bloodGroup = req.query.bloodGroup as BloodGroup;
  }
  
  if (req.query.city) {
    filter.city = new RegExp(req.query.city as string, 'i');
  }
  
  if (req.query.pincode) {
    filter.pincode = req.query.pincode as string;
  }
  
  if (req.query.isAvailable !== undefined) {
    filter.isAvailable = req.query.isAvailable === 'true';
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-googleId')
      .sort({ donationCount: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter)
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Users retrieved successfully',
    data: {
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    }
  });
});

// Get single user
export const getUser = catchAsync(async (req: Request, res: Response<IApiResponse<IUserDocument>>) => {
  const user = await User.findById(req.params.id).select('-googleId');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found'
    });
  }

  res.json({
    success: true,
    message: 'User retrieved successfully',
    data: user
  });
});

// Update user availability
export const updateUserAvailability = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IUserDocument>>) => {
  const { isAvailable } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user!._id,
    { isAvailable },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    message: 'User availability updated successfully',
    data: user!
  });
});

// Get available donors by blood group and location
export const getAvailableDonors = catchAsync(async (req: Request, res: Response<IApiResponse<IUserDocument[]>>) => {
  const { bloodGroup, city, pincode } = req.query;

  if (!bloodGroup) {
    return res.status(400).json({
      success: false,
      message: 'Blood group is required'
    });
  }

  const donors = await User.findAvailableDonors(
    bloodGroup as BloodGroup,
    city as string,
    pincode as string
  );

  res.json({
    success: true,
    message: 'Available donors retrieved successfully',
    data: donors
  });
});

// Get user statistics
export const getUserStats = catchAsync(async (req: Request, res: Response<IApiResponse<any>>) => {
  const stats = await User.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        totalDonors: {
          $sum: { $cond: [{ $eq: ['$userType', 'donor'] }, 1, 0] }
        },
        totalPatients: {
          $sum: { $cond: [{ $eq: ['$userType', 'patient'] }, 1, 0] }
        },
        totalHospitals: {
          $sum: { $cond: [{ $eq: ['$userType', 'hospital'] }, 1, 0] }
        },
        availableDonors: {
          $sum: { 
            $cond: [
              { $and: [{ $eq: ['$userType', 'donor'] }, { $eq: ['$isAvailable', true] }] }, 
              1, 
              0
            ] 
          }
        },
        verifiedUsers: {
          $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
        }
      }
    }
  ]);

  // Get blood group distribution
  const bloodGroupStats = await User.aggregate([
    { $match: { userType: 'donor', bloodGroup: { $exists: true } } },
    {
      $group: {
        _id: '$bloodGroup',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const userStats = stats[0] || {
    totalUsers: 0,
    totalDonors: 0,
    totalPatients: 0,
    totalHospitals: 0,
    availableDonors: 0,
    verifiedUsers: 0
  };

  res.json({
    success: true,
    message: 'User statistics retrieved successfully',
    data: {
      ...userStats,
      bloodGroupDistribution: bloodGroupStats
    }
  });
});

// Search users
export const searchUsers = catchAsync(async (req: Request, res: Response<IApiResponse<IUserDocument[]>>) => {
  const { q, userType, bloodGroup, city } = req.query;
  
  const filter: any = {};
  
  if (q) {
    filter.$or = [
      { name: new RegExp(q as string, 'i') },
      { email: new RegExp(q as string, 'i') },
      { city: new RegExp(q as string, 'i') }
    ];
  }
  
  if (userType) filter.userType = userType;
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (city) filter.city = new RegExp(city as string, 'i');

  const users = await User.find(filter)
    .select('-googleId')
    .sort({ donationCount: -1, createdAt: 1 })
    .limit(20);

  res.json({
    success: true,
    message: 'Search results retrieved successfully',
    data: users
  });
});

// Get user's donation history
export const getUserDonationHistory = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<any[]>>) => {
  const userId = req.params.id || req.user!._id;
  
  // Check if user is requesting their own data or is admin
  if (userId !== req.user!._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this user\'s donation history'
    });
  }

  const donations = await DonationRecord.find({ donorId: userId })
    .populate('requestId', 'patientName hospital urgency')
    .sort({ date: -1 });

  res.json({
    success: true,
    message: 'User donation history retrieved successfully',
    data: donations
  });
});

// Get user's contribution summary
export const getUserContributionSummary = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<any>>) => {
  const userId = req.params.id || req.user!._id;
  
  // Check if user is requesting their own data
  if (userId !== req.user!._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to view this user\'s contribution summary'
    });
  }

  const summary = await DonationRecord.aggregate([
    { $match: { donorId: userId, status: 'completed' } },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$unitsContributed' },
        totalPoints: { $sum: '$points' },
        averagePointsPerDonation: { $avg: '$points' },
        lastDonation: { $max: '$date' },
        firstDonation: { $min: '$date' }
      }
    }
  ]);

  const userSummary = summary[0] || {
    totalDonations: 0,
    totalUnits: 0,
    totalPoints: 0,
    averagePointsPerDonation: 0,
    lastDonation: null,
    firstDonation: null
  };

  // Calculate additional metrics
  if (userSummary.lastDonation) {
    const daysSinceLastDonation = Math.floor(
      (Date.now() - new Date(userSummary.lastDonation).getTime()) / (1000 * 60 * 60 * 24)
    );
    userSummary.daysSinceLastDonation = daysSinceLastDonation;
    userSummary.canDonate = daysSinceLastDonation >= 90;
  } else {
    userSummary.daysSinceLastDonation = null;
    userSummary.canDonate = true;
  }

  res.json({
    success: true,
    message: 'User contribution summary retrieved successfully',
    data: userSummary
  });
});

// Delete user account
export const deleteUserAccount = catchAsync(async (req: AuthRequest, res: Response<IApiResponse>) => {
  const userId = req.user!._id;

  // Delete user's donation records
  await DonationRecord.deleteMany({ donorId: userId });

  // Delete user account
  await User.findByIdAndDelete(userId);

  res.json({
    success: true,
    message: 'User account deleted successfully'
  });
});
