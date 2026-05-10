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

function validateLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    Number.isFinite(la) &&
    Number.isFinite(lo) &&
    la >= -90 &&
    la <= 90 &&
    lo >= -180 &&
    lo <= 180
  );
}

/**
 * GET /api/stations/nearby?lat=&lng=&maxDistance=5000
 * Returns nearby stations from DB (owner stations). Adds availableSlots count (free future slots).
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10000, fastCharging, maxPrice } = req.query;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat & lng required' });

    const latitude = Number(lat);
    const longitude = Number(lng);
    const maxDist = Number(maxDistance);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'Invalid lat or lng' });
    }

    const query = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [longitude, latitude] },
          $maxDistance: maxDist
        }
      }
    };

    if (maxPrice) {
      query.pricePerKwh = { $lte: Number(maxPrice) };
    }

    if (fastCharging === 'true') {
      query['chargers.type'] = { $regex: /fast|ccs|dc/i };
    }

    // find nearby stations (2dsphere index required on Station.location)
    const stations = await Station.find(query)
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

        // AI-based wait time simple heuristic (based on queue / next free slot)
        let waitTime = 0; // minutes
        if (freeCount === 0) {
          const nextFreeSlot = await Slot.findOne({
            stationId: s._id,
            isBooked: false,
            start: { $gte: now }
          }).sort({ start: 1 });

          if (nextFreeSlot) {
            waitTime = Math.max(0, Math.floor((new Date(nextFreeSlot.start) - now) / 60000));
          } else {
            // Assume 60 minutes base wait time + variance based on hour of day (AI model simplified)
            const hour = now.getHours();
            const trafficMultiplier = (hour >= 9 && hour <= 18) ? 1.5 : 0.8;
            waitTime = Math.floor(60 * trafficMultiplier);
          }
        }

        return { ...s, availableSlots: freeCount, waitTime };
      } catch (e) {
        console.warn('Slot count error for station', s._id, e && e.message);
        return { ...s, availableSlots: 0, waitTime: 30 };
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
        address,
        phone = '',
        lng,
        lat,
        chargers = [],
        pricePerKwh,
        openTime,
        closeTime,
        amenities,
        email,
        images
      } = req.body;

      if (!validateLatLng(lat, lng)) {
        return res.status(400).json({ message: 'Invalid latitude or longitude range' });
      }

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
          type: c.type || 'Normal',
          count: Number(c.count || c.chargerCount) || 1,
          isActive: c.isActive !== undefined ? Boolean(c.isActive) : true
        }));
      } else {
        // default single charger if none provided
        cleanChargers = [{ type: 'Normal', count: 1 }];
      }

      const safeAmenities = Array.isArray(amenities) ? amenities : [];
      const safeImages = Array.isArray(images) ? images : [];

      const station = await Station.create({
        ownerId,
        name: String(name).trim(),
        address: {
          city: address?.city || '',
          pincode: address?.pincode || '',
          village: address?.village || '',
          area: address?.area || '',
          fullAddress: address?.fullAddress || '',
        },
        phone: String(phone || ''),
        email: String(email || ''),
        type: req.body.type || 'Public',
        pricePerKwh: pricePerKwh !== undefined ? Number(pricePerKwh) : 0,
        openTime: openTime || '06:00',
        closeTime: closeTime || '22:00',
        amenities: safeAmenities,
        chargers: cleanChargers,
        images: safeImages,
        location: { type: 'Point', coordinates: [lngN, latN] }
      });

      // Automatically generate slots for the next 7 days
      try {
        const stationId = station._id;
        const now = new Date();
        const daysAhead = 7;
        const slotMinutes = 60; // default 1 hour slots
        const startHour = 6;
        const endHour = 22;

        const createdSlots = [];
        for (let day = 0; day < daysAhead; day++) {
          for (let h = startHour; h < endHour; h++) {
            // simple hourly slots
            const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, h, 0, 0);
            if (start < now) continue;
            const end = new Date(start.getTime() + slotMinutes * 60000);

            for (let chargerIndex = 0; chargerIndex < cleanChargers.length; chargerIndex++) {
              const charger = cleanChargers[chargerIndex];
              // use .count from our standardized cleanChargers
              const count = charger.count || 1;
              for (let copy = 0; copy < count; copy++) {
                createdSlots.push({
                  stationId,
                  chargerIndex,
                  chargerType: charger.type || 'Normal',
                  start,
                  end
                });
              }
            }
          }
        }
        const chunkSize = 1000;
        for (let i = 0; i < createdSlots.length; i += chunkSize) {
          await Slot.insertMany(createdSlots.slice(i, i + chunkSize));
        }
        console.log(`Generated ${createdSlots.length} slots for new station ${stationId}`);
      } catch (slotErr) {
        console.error('Auto slot generation failed', slotErr);
        // don't fail the request, just log
      }

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
      name, address, phone, lng, lat, chargers,
      pricePerKwh, openTime, closeTime,
      amenities, email, images
    } = req.body;

    if (name !== undefined) station.name = name;
    if (address !== undefined) {
      station.address = {
        city: address.city || station.address?.city || '',
        pincode: address.pincode || station.address?.pincode || '',
        village: address.village || station.address?.village || '',
        area: address.area || station.address?.area || '',
        fullAddress: address.fullAddress || station.address?.fullAddress || '',
      };
    }
    if (phone !== undefined) station.phone = phone;
    if (email !== undefined) station.email = email;
    if (pricePerKwh !== undefined) station.pricePerKwh = Number(pricePerKwh);
    if (openTime !== undefined) station.openTime = openTime;
    if (closeTime !== undefined) station.closeTime = closeTime;
    if (amenities !== undefined) station.amenities = Array.isArray(amenities) ? amenities : station.amenities;
    if (images !== undefined) station.images = Array.isArray(images) ? images : station.images;
    if (lng !== undefined && lat !== undefined) {
      if (!validateLatLng(lat, lng)) {
        return res.status(400).json({ message: 'Invalid lat/lng range' });
      }
      station.location.coordinates = [Number(lng), Number(lat)];
    }
    if (chargers !== undefined) {
      station.chargers = Array.isArray(chargers) ? chargers.map(c => ({
        type: c.type || 'Normal',
        count: Number(c.count || c.chargerCount) || 1,
        isActive: c.isActive !== undefined ? Boolean(c.isActive) : true
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

    if (![15, 30, 60].includes(Number(slotMinutes))) return res.status(400).json({ message: 'slotMinutes must be 15,30 or 60' });
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 24 || endHour <= startHour) return res.status(400).json({ message: 'Invalid hours' });

    // delete existing future slots if regenerate true
    const now = new Date();
    if (regenerate) {
      await Slot.deleteMany({ stationId: stationId, start: { $gte: now } });
    }

    // generate slots
    const created = [];
    const chargersArray = Array.isArray(station.chargers) && station.chargers.length > 0 ? station.chargers : [{ count: 1, type: 'AC' }];

    // Normalize date to start of days
    const baseDate = new Date(now);
    baseDate.setHours(0, 0, 0, 0);

    for (let day = 0; day < daysAhead; day++) {
      // Loop hours
      // If today, we might want to skip past hours, but simple logic: 
      // construct date, check if > now.

      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += slotMinutes) {
          const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + day, h, m, 0);

          if (start < now) continue; // skip past times

          const end = new Date(start.getTime() + slotMinutes * 60000);

          for (let chargerIndex = 0; chargerIndex < chargersArray.length; chargerIndex++) {
            const charger = chargersArray[chargerIndex];
            // Fix: use .count instead of .chargerCount, handle both for safety
            const count = charger.count || charger.chargerCount || 1;

            for (let copy = 0; copy < count; copy++) {
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

/**
 * GET /api/stations/:id/owner-slots?from=&to=&onlyFree=true&limit=500
 * returns slots for ALL stations belonging to the owner of the specified station
 */
router.get('/:id/owner-slots', async (req, res) => {
  try {
    const stationId = req.params.id;
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    const onlyFree = req.query.onlyFree !== 'false';
    const limit = Number(req.query.limit) || 500;

    const sourceStation = await Station.findById(stationId).lean();
    if (!sourceStation) return res.status(404).json({ message: 'Owner reference point not found' });

    const ownerId = sourceStation.ownerId;
    const allStations = await Station.find({ ownerId }).select('_id name').lean();
    const stationIds = allStations.map(s => s._id);

    const filter = {
      stationId: { $in: stationIds },
      start: { $gte: from, $lt: to }
    };
    if (onlyFree) filter.isBooked = false;

    // fetch slots and populate station name if possible (or handle in frontend)
    const slots = await Slot.find(filter).sort({ start: 1 }).limit(limit).lean();

    // Map station names for UX convenience
    const stationMap = {};
    allStations.forEach(s => stationMap[String(s._id)] = s.name);

    const enrichedSlots = slots.map(sl => ({
      ...sl,
      stationName: stationMap[String(sl.stationId)] || 'Nearby Station'
    }));

    res.json(enrichedSlots);
  } catch (err) {
    console.error('owner-slots error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/stations/search?q=...
 * Database-wide search by station name or address (fullAddress).
 */
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ message: 'Search query required' });

    const regex = new RegExp(q, 'i');

    // Search by name or fullAddress
    const stations = await Station.find({
      $or: [
        { name: regex },
        { 'address.fullAddress': regex },
        { 'address.city': regex },
        { 'address.area': regex }
      ]
    }).limit(20).lean();

    // compute availableSlots for each station
    const now = new Date();
    const result = await Promise.all(stations.map(async (s) => {
      try {
        const freeCount = await Slot.countDocuments({
          stationId: s._id,
          isBooked: false,
          start: { $gte: now }
        });
        return { ...s, availableSlots: freeCount };
      } catch (e) {
        return { ...s, availableSlots: 0 };
      }
    }));

    res.json(result);
  } catch (err) {
    console.error('search error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/stations/:id/waiting-time
 * Estimates wait time dynamically
 */
router.get('/:id/waiting-time', async (req, res) => {
  try {
    const stationId = req.params.id;
    const now = new Date();
    const freeCount = await Slot.countDocuments({
      stationId,
      isBooked: false,
      start: { $gte: now }
    });

    let waitTime = 0;
    if (freeCount === 0) {
      const nextFreeSlot = await Slot.findOne({
        stationId,
        isBooked: false,
        start: { $gte: now }
      }).sort({ start: 1 });

      if (nextFreeSlot) {
        waitTime = Math.max(0, Math.floor((new Date(nextFreeSlot.start) - now) / 60000));
      } else {
        const hour = now.getHours();
        const trafficMultiplier = (hour >= 9 && hour <= 18) ? 1.5 : 0.8;
        waitTime = Math.floor(60 * trafficMultiplier);
      }
    }

    // Check pending bookings to add artificial delay (Wait time prediction logic)
    const pendingBookings = await mongoose.model('Booking').countDocuments({ stationId, status: 'pending' });
    waitTime += (pendingBookings * 10); // Predict 10 min extra wait per pending booking queue

    res.json({ waitTime, freeCount, pendingBookings });
  } catch (err) {
    console.error('Wait time error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
