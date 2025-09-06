export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UrgencyLevel = 'critical' | 'urgent' | 'normal';
export type UserType = 'donor' | 'patient' | 'hospital';
export type RequestStatus = 'active' | 'fulfilled' | 'expired' | 'cancelled';
export type DonationStatus = 'pending' | 'completed' | 'cancelled';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  userType: UserType;
  bloodGroup?: BloodGroup;
  phone: string;
  city: string;
  pincode: string;
  age?: number;
  weight?: number;
  donationCount?: number;
  isAvailable: boolean;
  lastDonation?: Date;
  googleId?: string;
  profilePicture?: string;
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBloodRequest {
  _id?: string;
  patientName: string;
  bloodGroup: BloodGroup;
  urgency: UrgencyLevel;
  hospital: string;
  city: string;
  pincode: string;
  unitsNeeded: number;
  contactPhone: string;
  description?: string;
  requesterId: string;
  requesterName: string;
  status: RequestStatus;
  fulfilledBy?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  expiresAt?: Date;
}

export interface IDonationRecord {
  _id?: string;
  donorId: string;
  donorName: string;
  bloodGroup: BloodGroup;
  requestId?: string;
  date: Date;
  hospital: string;
  city: string;
  unitsContributed: number;
  points: number;
  status: DonationStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IGoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

export interface IApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface IPaginationOptions {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
