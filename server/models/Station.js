// server/models/Station.js
const mongoose = require('mongoose');

const ChargerSchema = new mongoose.Schema({
  type: { type: String, enum: ['AC', 'DC'], default: 'AC' },
  powerKw: { type: Number, default: 7.4 },
  pricePerKwh: { type: Number, default: 0 },
  count: { type: Number, default: 1 }
}, { _id: false });

const StationSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },

  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },

  chargers: { type: [ChargerSchema], default: [] },

  images: { type: [String], default: [] },
  status: { type: String, enum: ['published','draft','suspended'], default: 'draft' },

  createdAt: { type: Date, default: Date.now }
});

// 2dsphere index for geo queries
StationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Station', StationSchema);
