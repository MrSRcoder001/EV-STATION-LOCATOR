const express = require('express');
const Booking = require('../models/Booking');
const Station = require('../models/Station');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

function emit(app, room, event, payload) {
  const io = app.get('io');
  if (io) io.to(room).emit(event, payload);
}

async function canAccessBooking(req, booking) {
  if (req.user.role === 'admin') return true;
  if (String(booking.userId) === String(req.user.id)) return true;
  if (!booking.stationId) return false;
  const station = await Station.findById(booking.stationId).select('ownerId').lean();
  return station && String(station.ownerId) === String(req.user.id);
}

router.post('/check-in', auth, async (req, res) => {
  const { bookingId, qrCode } = req.body;
  const booking = await Booking.findOne({ _id: bookingId, qrCode });
  if (!booking) return res.status(404).json({ message: 'Invalid booking or QR code' });
  if (!(await canAccessBooking(req, booking))) return res.status(403).json({ message: 'Not allowed' });
  if (!['accepted', 'active'].includes(booking.status)) {
    return res.status(400).json({ message: 'Booking must be accepted before check-in' });
  }
  booking.status = 'active';
  booking.checkInAt = booking.checkInAt || new Date();
  booking.sessionStartedAt = booking.sessionStartedAt || new Date();
  booking.meterStartKwh = Number(req.body.meterStartKwh || booking.meterStartKwh || 0);
  await booking.save();
  emit(req.app, `user:${booking.userId}`, 'session:updated', { bookingId: booking._id, status: booking.status });
  if (booking.ownerId) emit(req.app, `owner:${booking.ownerId}`, 'session:updated', { bookingId: booking._id, status: booking.status });
  res.json({ message: 'Check-in successful', booking });
});

router.put('/:bookingId/progress', auth, async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (!(await canAccessBooking(req, booking))) return res.status(403).json({ message: 'Not allowed' });
  booking.meterCurrentKwh = Number(req.body.meterCurrentKwh || booking.meterCurrentKwh || 0);
  booking.chargedKwh = Math.max(0, booking.meterCurrentKwh - booking.meterStartKwh);
  await booking.save();
  emit(req.app, `user:${booking.userId}`, 'session:progress', { bookingId: booking._id, chargedKwh: booking.chargedKwh });
  res.json(booking);
});

router.put('/:bookingId/complete', auth, async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return res.status(404).json({ message: 'Booking not found' });
  if (!(await canAccessBooking(req, booking))) return res.status(403).json({ message: 'Not allowed' });
  booking.status = 'completed';
  booking.sessionEndedAt = new Date();
  booking.meterEndKwh = Number(req.body.meterEndKwh || booking.meterCurrentKwh || booking.meterStartKwh);
  booking.chargedKwh = Math.max(0, booking.meterEndKwh - booking.meterStartKwh);
  await booking.save();
  emit(req.app, `user:${booking.userId}`, 'session:updated', { bookingId: booking._id, status: booking.status });
  if (booking.ownerId) emit(req.app, `owner:${booking.ownerId}`, 'session:updated', { bookingId: booking._id, status: booking.status });
  res.json({ message: 'Session completed', booking });
});

module.exports = router;
