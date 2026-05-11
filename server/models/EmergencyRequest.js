const mongoose = require('mongoose');

const EmergencyRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
  assignedOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  address: { type: String, default: '' },
  batteryPercent: { type: Number, min: 0, max: 100, default: 0 },
  connectorType: { type: String, default: 'Any' },
  note: { type: String, default: '' },
  status: {
    type: String,
    enum: ['open', 'assigned', 'on_the_way', 'resolved', 'cancelled'],
    default: 'open'
  },
  priority: { type: String, enum: ['normal', 'high', 'critical'], default: 'normal' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EmergencyRequestSchema.index({ location: '2dsphere' });
EmergencyRequestSchema.index({ status: 1, createdAt: -1 });
EmergencyRequestSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('EmergencyRequest', EmergencyRequestSchema);
