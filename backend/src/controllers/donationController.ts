import { Request, Response } from 'express';
import DonationRecord, { IDonationRecordDocument } from '../models/DonationRecord';
import BloodRequest from '../models/BloodRequest';
import User from '../models/User';
import { IApiResponse, IPaginatedResponse } from '../types';
import { catchAsync } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Create donation record
export const createDonationRecord = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IDonationRecordDocument>>) => {
  const donationData = {
    ...req.body,
    donorId: req.user!._id,
    donorName: req.user!.name,
    bloodGroup: req.user!.bloodGroup
  };

  const donationRecord = new DonationRecord(donationData);
  await donationRecord.save();

  // If this donation is for a specific request, update the request
  if (req.body.requestId) {
    await BloodRequest.findByIdAndUpdate(
      req.body.requestId,
      { $addToSet: { fulfilledBy: req.user!._id } }
    );
  }

  res.status(201).json({
    success: true,
    message: 'Donation record created successfully',
    data: donationRecord
  });
});

// Get all donation records with pagination
export const getDonationRecords = catchAsync(async (req: Request, res: Response<IApiResponse<IPaginatedResponse<IDonationRecordDocument>>>) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const filter: any = {};
  
  if (req.query.status) {
    filter.status = req.query.status;
  }
  
  if (req.query.bloodGroup) {
    filter.bloodGroup = req.query.bloodGroup;
  }
  
  if (req.query.city) {
    filter.city = new RegExp(req.query.city as string, 'i');
  }

  const [donations, total] = await Promise.all([
    DonationRecord.find(filter)
      .populate('donorId', 'name email phone bloodGroup')
      .populate('requestId', 'patientName hospital urgency')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    DonationRecord.countDocuments(filter)
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Donation records retrieved successfully',
    data: {
      data: donations,
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

// Get single donation record
export const getDonationRecord = catchAsync(async (req: Request, res: Response<IApiResponse<IDonationRecordDocument>>) => {
  const donationRecord = await DonationRecord.findById(req.params.id)
    .populate('donorId', 'name email phone bloodGroup')
    .populate('requestId', 'patientName hospital urgency');

  if (!donationRecord) {
    return res.status(404).json({
      success: false,
      message: 'Donation record not found'
    });
  }

  res.json({
    success: true,
    message: 'Donation record retrieved successfully',
    data: donationRecord
  });
});

// Update donation record
export const updateDonationRecord = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IDonationRecordDocument>>) => {
  const donationRecord = await DonationRecord.findById(req.params.id);

  if (!donationRecord) {
    return res.status(404).json({
      success: false,
      message: 'Donation record not found'
    });
  }

  // Check if user is the donor
  if (donationRecord.donorId.toString() !== req.user!._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this donation record'
    });
  }

  // Don't allow updates to completed donations
  if (donationRecord.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update completed donations'
    });
  }

  const updatedRecord = await DonationRecord.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('donorId', 'name email phone bloodGroup');

  res.json({
    success: true,
    message: 'Donation record updated successfully',
    data: updatedRecord!
  });
});

// Mark donation as completed
export const completeDonation = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IDonationRecordDocument>>) => {
  const donationRecord = await DonationRecord.findById(req.params.id);

  if (!donationRecord) {
    return res.status(404).json({
      success: false,
      message: 'Donation record not found'
    });
  }

  if (donationRecord.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Donation is not pending'
    });
  }

  donationRecord.status = 'completed';
  await donationRecord.save();

  res.json({
    success: true,
    message: 'Donation marked as completed',
    data: donationRecord
  });
});

// Get user's donation records
export const getUserDonationRecords = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IDonationRecordDocument[]>>) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [donations, total] = await Promise.all([
    DonationRecord.find({ donorId: req.user!._id })
      .populate('requestId', 'patientName hospital urgency')
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit),
    DonationRecord.countDocuments({ donorId: req.user!._id })
  ]);

  res.json({
    success: true,
    message: 'User donation records retrieved successfully',
    data: donations
  });
});

// Get donation statistics
export const getDonationStats = catchAsync(async (req: Request, res: Response<IApiResponse<any>>) => {
  const stats = await DonationRecord.getStatistics();
  
  res.json({
    success: true,
    message: 'Donation statistics retrieved successfully',
    data: stats[0] || {
      totalDonations: 0,
      totalUnits: 0,
      totalPoints: 0,
      completedDonations: 0,
      pendingDonations: 0,
      cancelledDonations: 0
    }
  });
});

// Get top donors leaderboard
export const getTopDonors = catchAsync(async (req: Request, res: Response<IApiResponse<any[]>>) => {
  const limit = parseInt(req.query.limit as string) || 10;
  
  const topDonors = await DonationRecord.getTopDonors(limit);
  
  res.json({
    success: true,
    message: 'Top donors retrieved successfully',
    data: topDonors
  });
});

// Get donations by blood group
export const getDonationsByBloodGroup = catchAsync(async (req: Request, res: Response<IApiResponse<any[]>>) => {
  const donationsByBloodGroup = await DonationRecord.getDonationsByBloodGroup();
  
  res.json({
    success: true,
    message: 'Donations by blood group retrieved successfully',
    data: donationsByBloodGroup
  });
});

// Get user's donation summary
export const getUserDonationSummary = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<any>>) => {
  const userId = req.user!._id;
  
  const summary = await DonationRecord.aggregate([
    { $match: { donorId: userId } },
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$unitsContributed' },
        totalPoints: { $sum: '$points' },
        completedDonations: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        lastDonation: { $max: '$date' },
        averagePointsPerDonation: { $avg: '$points' }
      }
    }
  ]);

  const userSummary = summary[0] || {
    totalDonations: 0,
    totalUnits: 0,
    totalPoints: 0,
    completedDonations: 0,
    lastDonation: null,
    averagePointsPerDonation: 0
  };

  // Calculate days since last donation
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
    message: 'User donation summary retrieved successfully',
    data: userSummary
  });
});

// Cancel donation
export const cancelDonation = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IDonationRecordDocument>>) => {
  const donationRecord = await DonationRecord.findById(req.params.id);

  if (!donationRecord) {
    return res.status(404).json({
      success: false,
      message: 'Donation record not found'
    });
  }

  // Check if user is the donor
  if (donationRecord.donorId.toString() !== req.user!._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to cancel this donation'
    });
  }

  if (donationRecord.status === 'completed') {
    return res.status(400).json({
      success: false,
      message: 'Cannot cancel completed donations'
    });
  }

  donationRecord.status = 'cancelled';
  await donationRecord.save();

  res.json({
    success: true,
    message: 'Donation cancelled successfully',
    data: donationRecord
  });
});
