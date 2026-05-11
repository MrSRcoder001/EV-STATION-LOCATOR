const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String, trim: true, default: '' },
  createdAt: { type: Date, default: Date.now }
});

ReviewSchema.index({ stationId: 1, createdAt: -1 });
ReviewSchema.index({ stationId: 1, userId: 1, bookingId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Review', ReviewSchema);
