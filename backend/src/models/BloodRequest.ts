import mongoose, { Document, Schema } from 'mongoose';
import { IBloodRequest, BloodGroup, UrgencyLevel, RequestStatus } from '../types';

export interface IBloodRequestDocument extends IBloodRequest, Document {
  isExpired(): boolean;
  canBeFulfilled(): boolean;
  toJSON(): any;
}

const BloodRequestSchema = new Schema<IBloodRequestDocument>({
  patientName: {
    type: String,
    required: [true, 'Patient name is required'],
    trim: true,
    maxlength: [100, 'Patient name cannot be more than 100 characters']
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: [true, 'Blood group is required']
  },
  urgency: {
    type: String,
    enum: ['critical', 'urgent', 'normal'],
    required: [true, 'Urgency level is required'],
    default: 'normal'
  },
  hospital: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true,
    maxlength: [200, 'Hospital name cannot be more than 200 characters']
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
  unitsNeeded: {
    type: Number,
    required: [true, 'Units needed is required'],
    min: [1, 'At least 1 unit is required'],
    max: [10, 'Maximum 10 units can be requested at once']
  },
  contactPhone: {
    type: String,
    required: [true, 'Contact phone is required'],
    match: [/^\+?[\d\s-()]+$/, 'Please provide a valid phone number']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  requesterId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requester ID is required']
  },
  requesterName: {
    type: String,
    required: [true, 'Requester name is required'],
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'expired', 'cancelled'],
    default: 'active'
  },
  fulfilledBy: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  expiresAt: {
    type: Date,
    default: function(this: IBloodRequestDocument) {
      // Set expiration based on urgency
      const now = new Date();
      switch (this.urgency) {
        case 'critical':
          return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
        case 'urgent':
          return new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
        default:
          return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
BloodRequestSchema.index({ status: 1, urgency: 1 });
BloodRequestSchema.index({ bloodGroup: 1, city: 1 });
BloodRequestSchema.index({ createdAt: -1 });
BloodRequestSchema.index({ expiresAt: 1 });
BloodRequestSchema.index({ requesterId: 1 });

// Virtual for time remaining
BloodRequestSchema.virtual('timeRemaining').get(function(this: IBloodRequestDocument) {
  if (!this.expiresAt || this.status !== 'active') return null;
  
  const now = new Date();
  const timeLeft = this.expiresAt.getTime() - now.getTime();
  
  if (timeLeft <= 0) return 0;
  
  return Math.ceil(timeLeft / (1000 * 60 * 60)); // hours
});

// Virtual for urgency score (for sorting)
BloodRequestSchema.virtual('urgencyScore').get(function(this: IBloodRequestDocument) {
  const scores = { critical: 3, urgent: 2, normal: 1 };
  return scores[this.urgency] || 0;
});

// Instance methods
BloodRequestSchema.methods.isExpired = function(this: IBloodRequestDocument) {
  return this.expiresAt && this.expiresAt < new Date();
};

BloodRequestSchema.methods.canBeFulfilled = function(this: IBloodRequestDocument) {
  return this.status === 'active' && !this.isExpired();
};

// Pre-save middleware to update status if expired
BloodRequestSchema.pre('save', function(this: IBloodRequestDocument, next) {
  if (this.isExpired() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Static method to find active requests by blood group and location
BloodRequestSchema.statics.findActiveRequests = function(
  bloodGroup?: BloodGroup,
  city?: string,
  pincode?: string,
  urgency?: UrgencyLevel
) {
  const query: any = {
    status: 'active',
    expiresAt: { $gt: new Date() }
  };

  if (bloodGroup) {
    query.bloodGroup = bloodGroup;
  }
  if (city) {
    query.city = new RegExp(city, 'i');
  }
  if (pincode) {
    query.pincode = pincode;
  }
  if (urgency) {
    query.urgency = urgency;
  }

  return this.find(query)
    .populate('requesterId', 'name email phone')
    .sort({ urgency: -1, createdAt: 1 });
};

// Static method to get request statistics
BloodRequestSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ['$status', 'active'] }, { $gt: ['$expiresAt', new Date()] }] },
              1,
              0
            ]
          }
        },
        fulfilled: {
          $sum: { $cond: [{ $eq: ['$status', 'fulfilled'] }, 1, 0] }
        },
        expired: {
          $sum: { $cond: [{ $eq: ['$status', 'expired'] }, 1, 0] }
        },
        critical: {
          $sum: { $cond: [{ $eq: ['$urgency', 'critical'] }, 1, 0] }
        },
        urgent: {
          $sum: { $cond: [{ $eq: ['$urgency', 'urgent'] }, 1, 0] }
        },
        normal: {
          $sum: { $cond: [{ $eq: ['$urgency', 'normal'] }, 1, 0] }
        }
      }
    }
  ]);
};

export default mongoose.model<IBloodRequestDocument>('BloodRequest', BloodRequestSchema);
