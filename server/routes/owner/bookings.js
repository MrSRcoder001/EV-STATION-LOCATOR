// server/routes/owner/bookings.js
const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../../models/Booking');
const Slot = require('../../models/Slot');
const Station = require('../../models/Station');
const auth = require('../../middlewares/authMiddleware'); // sets req.user
const ownerMiddleware = require('../../middlewares/ownerMiddleware'); // ensures owner role
const router = express.Router();

// helper emit (optional)
function emitToUser(app, userId, event, payload) {
  try {
    const io = app.get('io');
    if (io && userId) io.to(`user:${String(userId)}`).emit(event, payload);
  } catch (e) {
    console.warn('emit failed', e?.message || e);
  }
}

/**
 * GET /api/owner/bookings
 * returns bookings for stations owned by logged-in owner
 */
router.get('/', auth, ownerMiddleware, async (req, res) => {
  try {
    const ownerId = req.user.id;
    // populate minimal user & station info
    const bookings = await Booking.find({ ownerId })
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .populate('slotId', 'start end chargerType')
      .populate('stationId', 'name address')
      .lean();
    res.json(bookings);
  } catch (err) {
    console.error('Owner bookings list error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/owner/bookings/:id/decision
 * body: { action: 'accept' | 'reject' }
 */
router.put('/:id/decision', auth, ownerMiddleware, async (req, res) => {
  const ownerId = req.user.id;
  const bookingId = req.params.id;
  const { action } = req.body;

  if (!['accept', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Invalid action' });
  }
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({ message: 'Invalid booking id' });
  }

  try {
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Ensure owner owns this booking (booking.ownerId set at creation)
    if (!booking.ownerId || String(booking.ownerId) !== String(ownerId)) {
      return res.status(403).json({ message: 'Not allowed to decide this booking' });
    }

    if (booking.status && booking.status !== 'pending') {
      return res.status(400).json({ message: `Booking already ${booking.status}` });
    }

    if (action === 'accept') {
      booking.status = 'accepted';
      booking.decidedAt = new Date();
      await booking.save();

      // mark slot confirmed (if slot exists)
      if (booking.slotId) {
        try {
          await Slot.findByIdAndUpdate(booking.slotId, { $set: { isBooked: true, confirmedAt: new Date() } });
        } catch (e) { console.warn('slot confirm warning', e); }
      }

      emitToUser(req.app, booking.userId, 'booking:updated', { bookingId: booking._id, status: 'accepted' });
      return res.json({ message: 'Booking accepted', booking });
    } else {
      // reject
      booking.status = 'rejected';
      booking.decidedAt = new Date();
      await booking.save();

      if (booking.slotId) {
        try {
          await Slot.findByIdAndUpdate(booking.slotId, { $set: { isBooked: false, bookedAt: null } });
        } catch (e) { console.warn('slot free warning', e); }
      }

      emitToUser(req.app, booking.userId, 'booking:updated', { bookingId: booking._id, status: 'rejected' });
      return res.json({ message: 'Booking rejected', booking });
    }
  } catch (err) {
    console.error('Owner decide error', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
