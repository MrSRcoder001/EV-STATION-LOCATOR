const express = require('express');
const EmergencyRequest = require('../models/EmergencyRequest');
const Station = require('../models/Station');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

function emit(app, room, event, payload) {
  const io = app.get('io');
  if (io) io.to(room).emit(event, payload);
}

router.post('/', auth, async (req, res) => {
  try {
    const { lat, lng, batteryPercent = 0, connectorType = 'Any', address = '', note = '' } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'Valid lat/lng required' });
    }

    const nearestStation = await Station.findOne({
      approvalStatus: 'approved',
      status: 'Active',
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [longitude, latitude] },
          $maxDistance: 25000
        }
      }
    }).lean();

    const priority = Number(batteryPercent) <= 10 ? 'critical' : Number(batteryPercent) <= 20 ? 'high' : 'normal';
    const request = await EmergencyRequest.create({
      userId: req.user.id,
      stationId: nearestStation?._id,
      assignedOwnerId: nearestStation?.ownerId,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      address,
      batteryPercent,
      connectorType,
      note,
      priority,
      status: nearestStation ? 'assigned' : 'open'
    });

    if (nearestStation?.ownerId) {
      emit(req.app, `owner:${nearestStation.ownerId}`, 'emergency:new', request);
    }
    const io = req.app.get('io');
    if (io) io.emit('admin:emergency', request);

    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/me', auth, async (req, res) => {
  const requests = await EmergencyRequest.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50);
  res.json(requests);
});

router.get('/owner', auth, async (req, res) => {
  if (!['owner', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Owner only' });
  const filter = req.user.role === 'admin' ? {} : { assignedOwnerId: req.user.id };
  const requests = await EmergencyRequest.find(filter)
    .populate('userId', 'name phone')
    .populate('stationId', 'name address')
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(requests);
});

router.put('/:id/status', auth, async (req, res) => {
  if (!['owner', 'admin'].includes(req.user.role)) return res.status(403).json({ message: 'Owner only' });
  const { status } = req.body;
  if (!['open', 'assigned', 'on_the_way', 'resolved', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const request = await EmergencyRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: 'Emergency request not found' });
  if (req.user.role !== 'admin' && String(request.assignedOwnerId) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Not allowed' });
  }
  request.status = status;
  await request.save();
  emit(req.app, `user:${request.userId}`, 'emergency:updated', request);
  res.json(request);
});

module.exports = router;
