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

  isBlocked: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
