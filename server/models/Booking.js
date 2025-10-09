const mongoose = require('mongoose');
const BookingSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  chargerIndex: Number,
  slotIndex: Number,
  start: Date,
  end: Date,
  status: { type: String, enum: ['BOOKED','CANCELLED','COMPLETED'], default: 'BOOKED' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Booking', BookingSchema);
