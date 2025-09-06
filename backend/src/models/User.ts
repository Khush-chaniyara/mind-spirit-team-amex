import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUser, BloodGroup, UserType } from '../types';

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

const UserSchema = new Schema<IUserDocument>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  userType: {
    type: String,
    enum: ['donor', 'patient', 'hospital'],
    required: [true, 'User type is required']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: function(this: IUserDocument) {
      return this.userType === 'donor';
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode']
  },
  age: {
    type: Number,
    min: [18, 'Age must be at least 18'],
    max: [65, 'Age must be at most 65'],
    required: function(this: IUserDocument) {
      return this.userType === 'donor';
    }
  },
  weight: {
    type: Number,
    min: [50, 'Weight must be at least 50 kg'],
    max: [150, 'Weight must be at most 150 kg'],
    required: function(this: IUserDocument) {
      return this.userType === 'donor';
    }
  },
  donationCount: {
    type: Number,
    default: 0,
    min: 0
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  lastDonation: {
    type: Date
  },
  googleId: {
    type: String,
    sparse: true
  },
  profilePicture: {
    type: String
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
UserSchema.index({ email: 1 });
UserSchema.index({ userType: 1 });
UserSchema.index({ bloodGroup: 1 });
UserSchema.index({ city: 1, pincode: 1 });
UserSchema.index({ isAvailable: 1 });

// Virtual for checking if user can donate
UserSchema.virtual('canDonate').get(function(this: IUserDocument) {
  if (this.userType !== 'donor' || !this.isAvailable) return false;
  if (!this.lastDonation) return true;
  
  const daysSinceLastDonation = Math.floor(
    (Date.now() - this.lastDonation.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return daysSinceLastDonation >= 90; // 90 days gap required
});

// Pre-save middleware
UserSchema.pre('save', async function(this: IUserDocument, next) {
  // Update lastDonation when donationCount changes
  if (this.isModified('donationCount') && this.donationCount! > 0) {
    this.lastDonation = new Date();
  }
  next();
});

// Instance method to remove sensitive data from JSON output
UserSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.googleId;
  return userObject;
};

// Static method to find available donors by blood group and location
UserSchema.statics.findAvailableDonors = function(
  bloodGroup: BloodGroup,
  city?: string,
  pincode?: string
) {
  const query: any = {
    userType: 'donor',
    isAvailable: true,
    $or: [
      { bloodGroup },
      { bloodGroup: 'O-' }, // Universal donor
      { bloodGroup: 'O+' }  // Universal donor for positive blood groups
    ]
  };

  if (city) {
    query.city = new RegExp(city, 'i');
  }
  if (pincode) {
    query.pincode = pincode;
  }

  return this.find(query)
    .select('-googleId')
    .sort({ donationCount: -1, createdAt: 1 });
};

export default mongoose.model<IUserDocument>('User', UserSchema);
