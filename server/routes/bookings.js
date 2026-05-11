// server/routes/bookings.js
const express = require('express');
const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const Station = require('../models/Station');
const Booking = require('../models/Booking');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Helper: emit event to owner room if socket.io attached to app
 */
function emitToOwner(app, ownerId, event, payload) {
  try {
    const io = app.get('io');
    if (io && ownerId) {
      io.to(`owner:${String(ownerId)}`).emit(event, payload);
    }
  } catch (e) {
    console.warn('emit failed', e?.message || e);
  }
}

function makeQrCode() {
  return `EVQR-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

/**
 * POST /api/bookings
 * Body:
 *  - { slotId }                                 -> book existing slot (slotId must be valid ObjectId)
 *  - { demo: true, stationId, start, end, ... } -> create real slot then book (demo->real)
 *  - or { demo: true, start, end, meta }        -> create booking without slot (for external/OCM fallback)
 *
 * Requires Authorization
 */
router.post('/', auth, async (req, res) => {
  const userId = req.user.id;
  const { slotId, demo, stationId, start, end, chargerType, meta } = req.body;

  // basic requirement: either slotId or demo payload
  if (!slotId && !demo) {
    return res.status(400).json({ message: 'slotId or demo payload required' });
  }

  // helper to test ObjectId-like
  const isObjectId = (v) => typeof v === 'string' && mongoose.Types.ObjectId.isValid(v);

  // Validate dates if provided
  if (start && isNaN(new Date(start).getTime())) {
    return res.status(400).json({ message: 'Invalid start date format' });
  }
  if (end && isNaN(new Date(end).getTime())) {
    return res.status(400).json({ message: 'Invalid end date format' });
  }

  try {
    // CASE 1: slotId provided and looks like an ObjectId -> reserve existing slot
    if (slotId && isObjectId(slotId)) {
      // Atomically reserve slot only if not already booked
      const slot = await Slot.findOneAndUpdate(
        { _id: slotId, isBooked: { $ne: true } },
        { $set: { isBooked: true, bookedAt: new Date() } },
        { new: true }
      ).lean();

      if (!slot) return res.status(409).json({ message: 'Slot already booked' });

      const station = await Station.findById(slot.stationId).lean();
      if (!station) {
        // rollback slot booked flag if station missing
        try {
          await Slot.findByIdAndUpdate(slotId, { $set: { isBooked: false, bookedAt: null } });
        } catch (e) {
          console.warn('Rollback failed', e);
        }
        return res.status(400).json({ message: 'Station not found for slot' });
      }

      const booking = await Booking.create({
        slotId: slot._id,
        stationId: station._id,
        userId,
        ownerId: station.ownerId,
        status: 'pending',
        qrCode: makeQrCode(),
        meta: { chargerType: slot.chargerType, chargerIndex: slot.chargerIndex || 0, ...(meta || {}) }
      });

      // notify owner
      emitToOwner(req.app, station.ownerId, 'booking:new', {
        bookingId: booking._id,
        stationId: station._id,
        stationName: station.name,
        start: slot.start,
        end: slot.end,
        userId,
        status: booking.status
      });

      return res.status(201).json({ bookingId: booking._id, status: booking.status });
    }

    // CASE 2: slotId provided but NOT an ObjectId OR demo flag used -> treat as demo booking
    // Require start & end for creating a real slot; if stationId present create slot and booking.
    if (demo || (slotId && !isObjectId(slotId))) {
      // if slotId is non-ObjectId but start/end provided, we can treat similarly to demo
      if (!start || !end) {
        return res.status(400).json({ message: 'start and end are required for demo booking' });
      }

      // If stationId provided and valid -> create a new Slot document and book it immediately
      if (stationId) {
        const station = await Station.findById(stationId).lean();
        if (!station) return res.status(400).json({ message: 'Station not found' });

        const slotDoc = {
          stationId: station._id,
          chargerIndex: 0,
          chargerType: chargerType || 'AC',
          start: new Date(start),
          end: new Date(end),
          isBooked: true,
          bookedAt: new Date()
        };

        const createdSlot = await Slot.create(slotDoc);

        try {
          const booking = await Booking.create({
            slotId: createdSlot._id,
            stationId: station._id,
            userId,
            ownerId: station.ownerId,
            status: 'pending',
            qrCode: makeQrCode(),
            meta: { chargerType: createdSlot.chargerType, chargerIndex: createdSlot.chargerIndex || 0, demoCreated: true, ...(meta || {}) }
          });

          // notify owner
          emitToOwner(req.app, station.ownerId, 'booking:new', {
            bookingId: booking._id,
            stationId: station._id,
            stationName: station.name,
            start: createdSlot.start,
            end: createdSlot.end,
            userId,
            status: booking.status
          });

          return res.status(201).json({ bookingId: booking._id, status: booking.status, createdSlotId: createdSlot._id });
        } catch (bookingErr) {
          // rollback created slot if booking creation failed
          try {
            await Slot.findByIdAndDelete(createdSlot._id);
          } catch (delErr) {
            console.error('Rollback slot delete failed', delErr);
          }
          console.error('Booking create failed after creating demo slot', bookingErr);
          return res.status(500).json({ message: 'Failed to create booking after creating slot' });
        }
      }

      // If stationId NOT provided (external/OCM demo) -> create Booking without Slot (meta contains times & OCM info)
      const booking = await Booking.create({
        slotId: null,
        stationId: null,
        userId,
        ownerId: null,
        status: 'pending',
        qrCode: makeQrCode(),
        meta: {
          demoCreated: true,
          start: new Date(start),
          end: new Date(end),
          ...(meta || {})
        }
      });

      return res.status(201).json({ bookingId: booking._id, status: booking.status });
    }

    // fallback
    return res.status(400).json({ message: 'Invalid booking request' });
  } catch (err) {
    console.error('Create booking error', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * DELETE /api/bookings/:id
 * Cancel booking by user (or admin)
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.userId) !== String(req.user.id) && req.user.role !== 'admin') return res.status(403).json({ message: 'Not allowed' });

    // disallow cancel of accepted bookings (optional)
    if (booking.status === 'accepted') return res.status(400).json({ message: 'Cannot cancel accepted booking' });

    await Booking.findByIdAndDelete(req.params.id);

    // free slot if exists
    if (booking.slotId) {
      try {
        await Slot.findByIdAndUpdate(booking.slotId, { $set: { isBooked: false, bookedAt: null } });
      } catch (e) {
        console.warn('Failed to free slot after cancellation', e);
      }
    }

    res.json({ message: 'Booking cancelled' });
  } catch (err) {
    console.error('Cancel booking error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/bookings/owner
 * Return bookings for stations owned by the authenticated user
 */
router.get('/owner', auth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Optimized query: Booking model has ownerId field
    const ownerBookings = await Booking.find({ ownerId: ownerId })
      .populate('stationId')
      .populate('userId', 'name email phone') // useful user info
      .populate('slotId')
      .sort({ createdAt: -1 });

    return res.json(ownerBookings);
  } catch (err) {
    console.error('GET /api/bookings/owner error', err);
    return res.status(500).json({ message: 'Server error' });
  }
});
/**
 * GET /api/bookings/me
 * returns bookings for current user (most recent first)
 */
router.get('/me', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('stationId', 'name address')
      .populate('slotId', 'start end chargerType')
      .sort({ createdAt: -1 })
      .limit(500);
    res.json(bookings);
  } catch (err) {
    console.error('Get my bookings error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/bookings/:id/pay
 * Mock payment for booking, calculates eco impact
 */
router.post('/:id/pay', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('stationId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'Booking already paid' });
    }

    // Mock Payment amount
    const amountToPay = req.body.amount || 150;
    const priceKwh = booking.stationId.pricePerKwh || 15;
    const kwhEstimate = amountToPay / priceKwh;

    // Update user wallet & eco impact
    const user = await User.findById(booking.userId);
    if (user) {
      if (String(user._id) !== String(req.user.id) && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not allowed to pay this booking' });
      }
      if (user.walletBalance < amountToPay) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      user.walletBalance -= amountToPay;
      if (!user.ecoStats) user.ecoStats = { co2Saved: 0, fuelCostSaved: 0 };
      user.ecoStats.co2Saved += (kwhEstimate * 0.85); // Dummy: 0.85 kg CO2 per kWh
      user.ecoStats.fuelCostSaved += (kwhEstimate * 5); // Dummy: $5 saved per kWh vs ICE
      await user.save();

      await WalletTransaction.create({
        userId: user._id,
        bookingId: booking._id,
        type: 'debit',
        amount: amountToPay,
        balanceAfter: user.walletBalance,
        description: `Payment for booking ${booking._id}`
      });
    }

    booking.paymentStatus = 'paid';
    booking.amount = amountToPay;
    booking.chargedKwh = kwhEstimate;
    await booking.save();

    res.json({ message: 'Payment successful', booking });
  } catch (err) {
    console.error('Payment error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
