// server/routes/owner/stations.js
const express = require('express');
const Station = require('../models/Station');
const auth = require('../middlewares/authMiddleware'); // make sure path correct
const owner = require('../middlewares/ownerMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const router = express.Router();

// Create station
router.post('/', auth, owner, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { name, address = '', phone = '', lng, lat, chargers = [] } = req.body;
    if (!name || lng === undefined || lat === undefined) {
      return res.status(400).json({ message: 'name, lat and lng required' });
    }
    const station = await Station.create({
      ownerId,
      name,
      address,
      phone,
      location: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
      chargers
    });
    res.json(station);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// List stations for owner
router.get('/', auth, owner, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const stations = await Station.find({ ownerId }).sort({ createdAt: -1 });
    res.json(stations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get station by id (owner only)
router.get('/:id', auth, owner, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    res.json(station);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update station
router.put('/:id', auth, owner, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const { name, address, phone, lng, lat, chargers, status } = req.body;
    if (name !== undefined) station.name = name;
    if (address !== undefined) station.address = address;
    if (phone !== undefined) station.phone = phone;
    if (lng !== undefined && lat !== undefined) station.location.coordinates = [Number(lng), Number(lat)];
    if (chargers !== undefined) station.chargers = chargers;
    if (status !== undefined) station.status = status;

    await station.save();
    res.json(station);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete station
router.delete('/:id', auth, owner, async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }
    await station.remove();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/upload', auth, owner, (req, res, next) => {
  // call multer
  upload.array('images', 5)(req, res, function (err) {
    if (err) {
      console.error('MULTER ERROR:', err);
      return res.status(400).json({ message: 'Upload error', error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('UPLOAD REQ FILES:', req.files); // ✅ Debug line

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files received', files: req.files });
    }
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });

    if (String(station.ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const fileUrls = req.files.map(f => `/uploads/${f.filename}`);
    station.images = station.images.concat(fileUrls);
    await station.save();

    res.json({
      message: 'Uploaded successfully',
      images: station.images,
      filesInfo: req.files   // ✅ for debug, you can remove later
    });
  } catch (err) {
    console.error('UPLOAD ERROR:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
