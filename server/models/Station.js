const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: {
    city: { type: String },
    pincode: { type: String },
    village: { type: String },
    area: { type: String },
    fullAddress: { type: String },
  },
  phone: { type: String },
  email: { type: String },
  type: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  chargers: [
    {
      type: { type: String }, // e.g. Fast, Normal, Slow, CCS2, Type2
      count: { type: Number, default: 1 }
    }
  ],
  amenities: [{ type: String }],
  openTime: { type: String, default: '06:00' },
  closeTime: { type: String, default: '22:00' },
  pricePerKwh: { type: Number, default: 0 },
  images: [{ type: String }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  createdAt: { type: Date, default: Date.now }
});

StationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Station', StationSchema);
