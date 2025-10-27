// server/routes/owner/stations.js
const express = require('express');
const mongoose = require('mongoose');

const Station = require('../models/Station');
const Slot = require('../models/Slot'); // used to compute availableSlots and to generate slots
const auth = require('../middlewares/authMiddleware'); // verifies JWT -> req.user
const owner = require('../middlewares/ownerMiddleware'); // checks role owner/admin
const upload = require('../middlewares/uploadMiddleware'); // multer instance or factory

const { body, validationResult } = require('express-validator');

const router = express.Router();

/**
 * GET /api/stations/nearby?lat=&lng=&maxDistance=5000
 * Returns nearby stations from DB (owner stations). Adds availableSlots count (free future slots).
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 5000 } = req.query;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat & lng required' });

    const latitude = Number(lat);
    const longitude = Number(lng);
    const maxDist = Number(maxDistance);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'Invalid lat or lng' });
    }

    // find nearby stations (2dsphere index required on Station.location)
    const stations = await Station.find({
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: maxDist
        }
      }
    })
    .limit(100)
    .lean();

    // compute availableSlots for each station (count of free future slots)
    const now = new Date();
    const stationsWithCounts = await Promise.all(stations.map(async (s) => {
      try {
        const freeCount = await Slot.countDocuments({
          stationId: s._id,
          isBooked: false,
          start: { $gte: now }
        });
        return { ...s, availableSlots: freeCount };
      } catch (e) {
        console.warn('Slot count error for station', s._id, e && e.message);
        return { ...s, availableSlots: 0 };
      }
    }));

    res.json(stationsWithCounts);
  } catch (err) {
    console.error('nearby error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /api/owner/stations
 * create a station (owner only)
 */
router.post(
  '/',
  auth,
  owner,
  // basic express-validator checks
  body('name').isString().trim().notEmpty().withMessage('name required'),
  body('lat').notEmpty().withMessage('lat required'),
  body('lng').notEmpty().withMessage('lng required'),
  async (req, res) => {
    try {
      // validationResult gives clearer 400 responses
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const ownerId = req.user.id;
      const {
        name,
        address = '',
        phone = '',
        lng,
        lat,
        chargers = [],
        city, state, pincode,
        pricePerKwh,
        slotDurationMinutes,
        openingHour, closingHour,
        amenities,
        status,
        website,
        email,
        images
      } = req.body;

      // lat/lng must be numbers
      const latN = Number(lat);
      const lngN = Number(lng);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
        return res.status(400).json({ message: 'Invalid lat or lng (must be numbers)' });
      }

      // sanitize/normalize chargers (ensure at least one charger)
      let cleanChargers = [];
      if (Array.isArray(chargers) && chargers.length > 0) {
        cleanChargers = chargers.map(c => ({
          type: c && c.type === 'DC' ? 'DC' : (c && c.type ? c.type : 'AC'),
          powerKw: c && c.powerKw !== undefined ? Number(c.powerKw) : undefined,
          chargerCount: c && c.chargerCount !== undefined ? Number(c.chargerCount) : 1,
          pricePerKwh: c && c.pricePerKwh !== undefined ? Number(c.pricePerKwh) : undefined
        }));
      } else {
        // default single AC charger if none provided
        cleanChargers = [{ type: 'AC', powerKw: undefined, chargerCount: 1 }];
      }

      const safeAmenities = Array.isArray(amenities) ? amenities.map(String) : [];
      const safeImages = Array.isArray(images) ? images.map(String) : [];

      const station = await Station.create({
        ownerId,
        name: String(name).trim(),
        address: String(address || ''),
        phone: String(phone || ''),
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        email: email || '',
        website: website || '',
        pricePerKwh: pricePerKwh !== undefined ? Number(pricePerKwh) : 0,
        slotDurationMinutes: slotDurationMinutes ? Number(slotDurationMinutes) : 30,
        openingHour: openingHour || '08:00',
        closingHour: closingHour || '22:00',
        amenities: safeAmenities,
        chargers: cleanChargers,
        status: status || 'draft',
        images: safeImages,
        location: { type: 'Point', coordinates: [lngN, latN] }
      });

      res.status(201).json(station);
    } catch (err) {
      console.error('Create station error', err && err.stack ? err.stack : err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * GET /api/owner/stations
 * list stations owned by authenticated owner
 */
router.get('/', auth, owner, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const stations = await Station.find({ ownerId }).sort({ createdAt: -1 });
    res.json(stations);
  } catch (err) {
    console.error('List owner stations error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/owner/stations/:id
 * get station (owner or admin)
 */
router.get('/:id', auth, owner, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(station);
  } catch (err) {
    console.error('Get station error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/owner/stations/:id
 * update station (owner or admin)
 */
router.put('/:id', auth, owner, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const {
      name, address, phone, lng, lat, chargers, status,
      city, state, pincode, pricePerKwh, slotDurationMinutes, openingHour, closingHour,
      amenities, email, website, images
    } = req.body;

    if (name !== undefined) station.name = name;
    if (address !== undefined) station.address = address;
    if (phone !== undefined) station.phone = phone;
    if (city !== undefined) station.city = city;
    if (state !== undefined) station.state = state;
    if (pincode !== undefined) station.pincode = pincode;
    if (email !== undefined) station.email = email;
    if (website !== undefined) station.website = website;
    if (pricePerKwh !== undefined) station.pricePerKwh = Number(pricePerKwh);
    if (slotDurationMinutes !== undefined) station.slotDurationMinutes = Number(slotDurationMinutes);
    if (openingHour !== undefined) station.openingHour = openingHour;
    if (closingHour !== undefined) station.closingHour = closingHour;
    if (amenities !== undefined) station.amenities = Array.isArray(amenities) ? amenities.map(String) : station.amenities;
    if (images !== undefined) station.images = Array.isArray(images) ? images.map(String) : station.images;
    if (status !== undefined) station.status = status;
    if (lng !== undefined && lat !== undefined) {
      const lngN = Number(lng);
      const latN = Number(lat);
      if (!Number.isFinite(lngN) || !Number.isFinite(latN)) {
        return res.status(400).json({ message: 'Invalid lat/lng' });
      }
      station.location.coordinates = [lngN, latN];
    }
    if (chargers !== undefined) {
      station.chargers = Array.isArray(chargers) ? chargers.map(c => ({
        type: c && c.type === 'DC' ? 'DC' : (c && c.type ? c.type : 'AC'),
        powerKw: c && c.powerKw !== undefined ? Number(c.powerKw) : undefined,
        chargerCount: c && c.chargerCount !== undefined ? Number(c.chargerCount) : 1,
        pricePerKwh: c && c.pricePerKwh !== undefined ? Number(c.pricePerKwh) : undefined
      })) : station.chargers;
    }

    await station.save();
    res.json(station);
  } catch (err) {
    console.error('Update station error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * DELETE /api/owner/stations/:id
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid station ID' });
    }
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    // Optionally check ownership
    await station.deleteOne();
    res.json({ message: 'Station deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/owner/stations/:id/upload
 * accepts up to 5 images under field name 'images'
 */
router.post(
  '/:id/upload',
  auth,
  owner,
  // multer handling wrapper
  (req, res, next) => {
    try {
      if (!upload) {
        console.error('Upload middleware not configured');
        return res.status(500).json({ message: 'Upload middleware not available' });
      }
      // if upload is a multer instance with .array available
      if (typeof upload.array === 'function') {
        return upload.array('images', 5)(req, res, (err) => {
          if (err) {
            console.error('MULTER ERROR:', err);
            return res.status(400).json({ message: 'Upload error', error: err.message });
          }
          next();
        });
      }
      // if upload is a factory function returning middleware (less common)
      if (typeof upload === 'function') {
        const mw = upload(); // assume calling returns middleware
        return mw.array('images', 5)(req, res, (err) => {
          if (err) {
            console.error('MULTER ERROR factory:', err);
            return res.status(400).json({ message: 'Upload error', error: err.message });
          }
          next();
        });
      }
      console.error('Upload middleware is of unexpected type:', typeof upload);
      return res.status(500).json({ message: 'Upload middleware not supported' });
    } catch (err) {
      console.error('Upload wrapper error', err);
      return res.status(500).json({ message: 'Upload error', error: err.message });
    }
  },
  async (req, res) => {
    try {
      // debug log
      console.log('UPLOAD REQ FILES:', req.files);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'No files received', files: req.files });
      }
      const station = await Station.findById(req.params.id);
      if (!station) return res.status(404).json({ message: 'Station not found' });

      if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }

      const fileUrls = req.files.map(f => `/uploads/${f.filename}`);
      station.images = (station.images || []).concat(fileUrls);
      await station.save();

      res.json({
        message: 'Uploaded successfully',
        images: station.images,
        filesInfo: req.files
      });
    } catch (err) {
      console.error('UPLOAD ERROR:', err && err.stack ? err.stack : err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  }
);

/**
 * POST /api/owner/stations/:id/slots
 * generate slots for station (same logic as earlier)
 */
// after station created

router.post('/:id/slots', auth, owner, async (req, res) => {

  
  try {
    const stationId = req.params.id;
    const station = await Station.findById(stationId);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    if (String(station.ownerId) !== String(req.user.id)) return res.status(403).json({ message: 'Not your station' });

    const { slotMinutes = 30, startHour = 8, endHour = 22, daysAhead = 7, regenerate = false } = req.body;

    if (![15,30,60].includes(Number(slotMinutes))) return res.status(400).json({ message: 'slotMinutes must be 15,30 or 60' });
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 24 || endHour <= startHour) return res.status(400).json({ message: 'Invalid hours' });

    // delete existing future slots if regenerate true
    const now = new Date();
    if (regenerate) {
      await Slot.deleteMany({ stationId: stationId, start: { $gte: now } });
    }

    // generate slots
    const created = [];
    const chargersArray = Array.isArray(station.chargers) && station.chargers.length > 0 ? station.chargers : [{ chargerCount: 1, type: 'AC' }];
    for (let day = 0; day < daysAhead; day++) {
      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += slotMinutes) {
          const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, h, m, 0);
          if (start < now) continue;
          const end = new Date(start.getTime() + slotMinutes * 60000);

          for (let chargerIndex = 0; chargerIndex < chargersArray.length; chargerIndex++) {
            const charger = chargersArray[chargerIndex] || { chargerCount: 1, type: 'AC' };
            const chargerCount = charger.chargerCount || 1;
            for (let copy = 0; copy < chargerCount; copy++) {
              created.push({
                stationId,
                chargerIndex,
                chargerType: charger.type || 'AC',
                start,
                end
              });
            }
          }
        }
      }
    }

    // bulk insert in chunks
    const chunkSize = 1000;
    for (let i = 0; i < created.length; i += chunkSize) {
      const chunk = created.slice(i, i + chunkSize);
      await Slot.insertMany(chunk);
    }

    res.json({ message: 'Slots generated', total: created.length });
  } catch (err) {
    console.error('Slot gen error', err && err.stack ? err.stack : err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
