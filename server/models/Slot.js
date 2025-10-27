const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  chargerIndex: { type: Number, default: 0 },
  chargerType: { type: String, default: 'AC' },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  isBooked: { type: Boolean, default: false },
  bookedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now }
});

SlotSchema.index({ stationId: 1 });
SlotSchema.index({ start: 1 });

module.exports = mongoose.model('Slot', SlotSchema);
