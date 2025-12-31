const mongoose = require('mongoose');

const StationLocationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point'
  },
  coordinates: {
    // [lng, lat]
    type: [Number],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length === 2;
      },
      message: props => `${props.value} must be [lng, lat]`
    }
  }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['user', 'owner', 'admin'], default: 'user' },

  // Station info (only for owners)
  stationName: { 
    type: String, 
    required: function() { return this.role === 'owner'; },
    default: ''
  },
  stationAddress: { 
    type: String, 
    required: function() { return this.role === 'owner'; },
    default: ''
  },
  stationLocation: {
    type: StationLocationSchema,
    required: function() { return this.role === 'owner'; },
    default: null
  },

  createdAt: { type: Date, default: Date.now }
});

// Add geospatial index only if querying location
UserSchema.index({ 'stationLocation': '2dsphere' });

module.exports = mongoose.model('User', UserSchema);
