import mongoose, { Document, Schema } from 'mongoose';
import { IDonationRecord, BloodGroup, DonationStatus } from '../types';

export interface IDonationRecordDocument extends IDonationRecord, Document {
  calculatePoints(): number;
  toJSON(): any;
}

const DonationRecordSchema = new Schema<IDonationRecordDocument>({
  donorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Donor ID is required']
  },
  donorName: {
    type: String,
    required: [true, 'Donor name is required'],
    trim: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: [true, 'Blood group is required']
  },
  requestId: {
    type: Schema.Types.ObjectId,
    ref: 'BloodRequest',
    required: false // Optional - can be general donation
  },
  date: {
    type: Date,
    required: [true, 'Donation date is required'],
    default: Date.now
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
  unitsContributed: {
    type: Number,
    required: [true, 'Units contributed is required'],
    min: [1, 'At least 1 unit must be contributed'],
    max: [2, 'Maximum 2 units can be contributed at once']
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
DonationRecordSchema.index({ donorId: 1, date: -1 });
DonationRecordSchema.index({ requestId: 1 });
DonationRecordSchema.index({ status: 1 });
DonationRecordSchema.index({ date: -1 });
DonationRecordSchema.index({ bloodGroup: 1 });

// Virtual for time since donation
DonationRecordSchema.virtual('daysSinceDonation').get(function(this: IDonationRecordDocument) {
  const now = new Date();
  const timeDiff = now.getTime() - this.date.getTime();
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
});

// Virtual for eligibility status
DonationRecordSchema.virtual('isEligibleForNextDonation').get(function(this: IDonationRecordDocument) {
  return this.daysSinceDonation >= 90; // 90 days gap required
});

// Instance methods
DonationRecordSchema.methods.calculatePoints = function(this: IDonationRecordDocument) {
  let basePoints = 50; // Base points per donation
  
  // Bonus points for urgent requests
  if (this.requestId) {
    basePoints += 25; // Bonus for responding to a request
  }
  
  // Bonus points for multiple units
  if (this.unitsContributed > 1) {
    basePoints += (this.unitsContributed - 1) * 25;
  }
  
  return basePoints;
};

// Pre-save middleware to calculate points
DonationRecordSchema.pre('save', function(this: IDonationRecordDocument, next) {
  if (this.isModified('unitsContributed') || this.isNew) {
    this.points = this.calculatePoints();
  }
  next();
});

// Post-save middleware to update donor's donation count
DonationRecordSchema.post('save', async function(this: IDonationRecordDocument) {
  if (this.status === 'completed') {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(
      this.donorId,
      {
        $inc: { donationCount: 1 },
        $set: { lastDonation: this.date }
      }
    );
  }
});

// Static method to get donation statistics
DonationRecordSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$unitsContributed' },
        totalPoints: { $sum: '$points' },
        completedDonations: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        pendingDonations: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        cancelledDonations: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get top donors
DonationRecordSchema.statics.getTopDonors = function(limit: number = 10) {
  return this.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $group: {
        _id: '$donorId',
        donorName: { $first: '$donorName' },
        bloodGroup: { $first: '$bloodGroup' },
        totalDonations: { $sum: 1 },
        totalUnits: { $sum: '$unitsContributed' },
        totalPoints: { $sum: '$points' },
        lastDonation: { $max: '$date' }
      }
    },
    {
      $sort: { totalPoints: -1, totalDonations: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// Static method to get donations by blood group
DonationRecordSchema.statics.getDonationsByBloodGroup = function() {
  return this.aggregate([
    {
      $match: { status: 'completed' }
    },
    {
      $group: {
        _id: '$bloodGroup',
        count: { $sum: 1 },
        totalUnits: { $sum: '$unitsContributed' },
        totalPoints: { $sum: '$points' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

export default mongoose.model<IDonationRecordDocument>('DonationRecord', DonationRecordSchema);
