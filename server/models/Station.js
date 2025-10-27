const mongoose = require('mongoose');

const StationSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  email: { type: String },
  type: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  chargers: [
    {
      type: { type: String, enum: ['Fast', 'Normal', 'Slow'], default: 'Normal' },
      count: { type: Number, default: 1 }
    }
  ],
  amenities: [{ type: String }],
  openTime: { type: String, default: '06:00' },
  closeTime: { type: String, default: '22:00' },
  pricePerKwh: { type: Number, default: 0 },
  images: [{ type: String }],
  // slots array: each slot has start/end times, charger index/type and booking flag
  slots: [
    {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      chargerIndex: { type: Number, default: 0 },
      chargerType: { type: String, default: 'AC' },
      isBooked: { type: Boolean, default: false }
    }
  ],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  createdAt: { type: Date, default: Date.now }
});

// helper to generate default slots for "today"
function generateDefaultSlotsForToday() {
  const times = [9, 10, 11, 13, 14, 16]; // hours in 24h
  const durationMinutes = 60;
  const slots = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const hour of times) {
    const start = new Date(today);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    slots.push({
      start: start.toISOString(),
      end: end.toISOString(),
      chargerIndex: 0,
      chargerType: 'AC',
      isBooked: false,
    });
  }
  return slots;
}

// Add pre-save hook: if new station and no slots provided, populate defaults
if (!StationSchema._defaultSlotsHookAdded) {
  StationSchema.pre('save', function (next) {
    try {
      // only for newly created stations
      if (this.isNew) {
        // adjust field name if your schema uses a different property (e.g., "slots" or "availableSlots")
        if (!this.slots || !Array.isArray(this.slots) || this.slots.length === 0) {
          this.slots = generateDefaultSlotsForToday();
        }
      }
    } catch (err) {
      // don't break save on hook error; log for debugging
      console.error('generate default slots error', err);
    }
    next();
  });
  // guard to avoid double-registering hook if file is reloaded
  StationSchema._defaultSlotsHookAdded = true;
}

StationSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Station', StationSchema);
