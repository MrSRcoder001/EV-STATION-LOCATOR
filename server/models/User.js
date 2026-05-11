const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    unique: true,
    required: true,
    lowercase: true,
    trim: true
  },

  passwordHash: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    default: ''
  },

  alternatePhone: {
    type: String,
    default: ''
  },

  profileImage: {
    type: String,
    default: ''
  },

  role: {
    type: String,
    enum: ['user', 'owner', 'admin'],
    default: 'user'
  },

  // For owners: initial station details (optional, can create more later)
  stationName: { type: String },
  stationAddress: {
    city: { type: String },
    pincode: { type: String },
    village: { type: String },
    area: { type: String },
    fullAddress: { type: String },
  },
  stationLocation: {
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number], default: undefined } // [lng, lat]
  },

  ecoStats: {
    co2Saved: { type: Number, default: 0 },
    fuelCostSaved: { type: Number, default: 0 }
  },

  walletBalance: {
    type: Number,
    default: 1000 // Initial dummy balance
  },

  ownerVerification: {
    status: {
      type: String,
      enum: ['not_submitted', 'pending', 'verified', 'rejected'],
      default: 'not_submitted'
    },
    documents: {
      governmentId: { type: String, default: '' },
      businessLicense: { type: String, default: '' },
      electricityBill: { type: String, default: '' },
      gstNumber: { type: String, default: '' }
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, default: '' }
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  blockedReason: {
    type: String,
    default: ''
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
