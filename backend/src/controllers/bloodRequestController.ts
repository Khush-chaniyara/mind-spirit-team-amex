import { Request, Response } from 'express';
import BloodRequest, { IBloodRequestDocument } from '../models/BloodRequest';
import User from '../models/User';
import { IApiResponse, IPaginatedResponse, BloodGroup, UrgencyLevel } from '../types';
import { catchAsync } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

// Create blood request
export const createBloodRequest = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IBloodRequestDocument>>) => {
  const requestData = {
    ...req.body,
    requesterId: req.user!._id,
    requesterName: req.user!.name
  };

  const bloodRequest = new BloodRequest(requestData);
  await bloodRequest.save();

  // Populate requester details
  await bloodRequest.populate('requesterId', 'name email phone');

  res.status(201).json({
    success: true,
    message: 'Blood request created successfully',
    data: bloodRequest
  });
});

// Get all blood requests with filtering and pagination
export const getBloodRequests = catchAsync(async (req: Request, res: Response<IApiResponse<IPaginatedResponse<IBloodRequestDocument>>>) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Build filter query
  const filter: any = { status: 'active' };
  
  if (req.query.bloodGroup) {
    filter.bloodGroup = req.query.bloodGroup as BloodGroup;
  }
  
  if (req.query.urgency) {
    filter.urgency = req.query.urgency as UrgencyLevel;
  }
  
  if (req.query.city) {
    filter.city = new RegExp(req.query.city as string, 'i');
  }
  
  if (req.query.pincode) {
    filter.pincode = req.query.pincode as string;
  }

  // Only show non-expired requests
  filter.expiresAt = { $gt: new Date() };

  const [requests, total] = await Promise.all([
    BloodRequest.find(filter)
      .populate('requesterId', 'name email phone')
      .sort({ urgency: -1, createdAt: 1 })
      .skip(skip)
      .limit(limit),
    BloodRequest.countDocuments(filter)
  ]);

  const pages = Math.ceil(total / limit);

  res.json({
    success: true,
    message: 'Blood requests retrieved successfully',
    data: {
      data: requests,
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

// Get single blood request
export const getBloodRequest = catchAsync(async (req: Request, res: Response<IApiResponse<IBloodRequestDocument>>) => {
  const bloodRequest = await BloodRequest.findById(req.params.id)
    .populate('requesterId', 'name email phone')
    .populate('fulfilledBy', 'name email phone bloodGroup');

  if (!bloodRequest) {
    return res.status(404).json({
      success: false,
      message: 'Blood request not found'
    });
  }

  res.json({
    success: true,
    message: 'Blood request retrieved successfully',
    data: bloodRequest
  });
});

// Update blood request
export const updateBloodRequest = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IBloodRequestDocument>>) => {
  const bloodRequest = await BloodRequest.findById(req.params.id);

  if (!bloodRequest) {
    return res.status(404).json({
      success: false,
      message: 'Blood request not found'
    });
  }

  // Check if user is the requester or admin
  if (bloodRequest.requesterId.toString() !== req.user!._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to update this request'
    });
  }

  // Don't allow updates to fulfilled or expired requests
  if (bloodRequest.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Cannot update non-active requests'
    });
  }

  const updatedRequest = await BloodRequest.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('requesterId', 'name email phone');

  res.json({
    success: true,
    message: 'Blood request updated successfully',
    data: updatedRequest!
  });
});

// Delete blood request
export const deleteBloodRequest = catchAsync(async (req: AuthRequest, res: Response<IApiResponse>) => {
  const bloodRequest = await BloodRequest.findById(req.params.id);

  if (!bloodRequest) {
    return res.status(404).json({
      success: false,
      message: 'Blood request not found'
    });
  }

  // Check if user is the requester
  if (bloodRequest.requesterId.toString() !== req.user!._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this request'
    });
  }

  await BloodRequest.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Blood request deleted successfully'
  });
});

// Mark request as fulfilled
export const fulfillRequest = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IBloodRequestDocument>>) => {
  const bloodRequest = await BloodRequest.findById(req.params.id);

  if (!bloodRequest) {
    return res.status(404).json({
      success: false,
      message: 'Blood request not found'
    });
  }

  if (bloodRequest.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Request is not active'
    });
  }

  bloodRequest.status = 'fulfilled';
  if (req.user!._id) {
    bloodRequest.fulfilledBy.push(req.user!._id);
  }
  
  await bloodRequest.save();

  res.json({
    success: true,
    message: 'Request marked as fulfilled',
    data: bloodRequest
  });
});

// Get user's blood requests
export const getUserBloodRequests = catchAsync(async (req: AuthRequest, res: Response<IApiResponse<IBloodRequestDocument[]>>) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [requests, total] = await Promise.all([
    BloodRequest.find({ requesterId: req.user!._id })
      .populate('fulfilledBy', 'name email phone bloodGroup')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    BloodRequest.countDocuments({ requesterId: req.user!._id })
  ]);

  res.json({
    success: true,
    message: 'User blood requests retrieved successfully',
    data: requests
  });
});

// Get nearby donors for a blood request
export const getNearbyDonors = catchAsync(async (req: Request, res: Response<IApiResponse<any[]>>) => {
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
    message: 'Nearby donors retrieved successfully',
    data: donors
  });
});

// Get blood request statistics
export const getBloodRequestStats = catchAsync(async (req: Request, res: Response<IApiResponse<any>>) => {
  const stats = await BloodRequest.getStatistics();
  
  res.json({
    success: true,
    message: 'Statistics retrieved successfully',
    data: stats[0] || {
      total: 0,
      active: 0,
      fulfilled: 0,
      expired: 0,
      critical: 0,
      urgent: 0,
      normal: 0
    }
  });
});

// Search blood requests
export const searchBloodRequests = catchAsync(async (req: Request, res: Response<IApiResponse<IBloodRequestDocument[]>>) => {
  const { q, bloodGroup, city, urgency } = req.query;
  
  const filter: any = { status: 'active', expiresAt: { $gt: new Date() } };
  
  if (q) {
    filter.$or = [
      { patientName: new RegExp(q as string, 'i') },
      { hospital: new RegExp(q as string, 'i') },
      { description: new RegExp(q as string, 'i') }
    ];
  }
  
  if (bloodGroup) filter.bloodGroup = bloodGroup;
  if (city) filter.city = new RegExp(city as string, 'i');
  if (urgency) filter.urgency = urgency;

  const requests = await BloodRequest.find(filter)
    .populate('requesterId', 'name email phone')
    .sort({ urgency: -1, createdAt: 1 })
    .limit(20);

  res.json({
    success: true,
    message: 'Search results retrieved successfully',
    data: requests
  });
});
