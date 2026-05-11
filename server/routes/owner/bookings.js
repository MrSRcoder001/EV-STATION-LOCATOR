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
 * GET /api/owner/bookings/analytics
 * summarizes owner revenue, occupancy, station usage, and booking status.
 */
router.get('/analytics', auth, ownerMiddleware, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const stations = await Station.find({ ownerId }).lean();
    const stationIds = stations.map((s) => s._id);
    const stationMap = {};
    stations.forEach((s) => {
      stationMap[String(s._id)] = s.name;
    });

    const bookings = await Booking.find({ ownerId }).populate('slotId').lean();
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const slots = stationIds.length
      ? await Slot.find({ stationId: { $in: stationIds }, start: { $gte: now, $lt: nextWeek } }).lean()
      : [];

    const statusCounts = bookings.reduce((acc, booking) => {
      const status = booking.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const hourlyUsage = Array.from({ length: 24 }, (_, hour) => ({ hour, bookings: 0 }));
    const stationPerformance = {};
    let revenue = 0;
    let totalKwh = 0;

    bookings.forEach((booking) => {
      revenue += Number(booking.amount || 0);
      totalKwh += Number(booking.chargedKwh || 0);

      const start = booking.slotId?.start || booking.meta?.start || booking.createdAt;
      const hour = new Date(start).getHours();
      if (Number.isInteger(hour) && hourlyUsage[hour]) hourlyUsage[hour].bookings += 1;

      const stationId = String(booking.stationId || '');
      if (!stationPerformance[stationId]) {
        stationPerformance[stationId] = {
          stationId,
          name: stationMap[stationId] || booking.meta?.stationName || 'Station',
          bookings: 0,
          revenue: 0,
          kwh: 0,
        };
      }
      stationPerformance[stationId].bookings += 1;
      stationPerformance[stationId].revenue += Number(booking.amount || 0);
      stationPerformance[stationId].kwh += Number(booking.chargedKwh || 0);
    });

    const totalSlots = slots.length;
    const bookedSlots = slots.filter((slot) => slot.isBooked).length;
    const availableSlots = totalSlots - bookedSlots;
    const occupancyRate = totalSlots ? Math.round((bookedSlots / totalSlots) * 100) : 0;
    const peakHour = hourlyUsage.reduce((peak, item) => item.bookings > peak.bookings ? item : peak, hourlyUsage[0]);

    res.json({
      stations: stations.length,
      chargers: stations.reduce((sum, station) => sum + (station.chargers || []).reduce((n, charger) => n + Number(charger.count || charger.chargerCount || 1), 0), 0),
      bookings: bookings.length,
      pendingBookings: statusCounts.pending || 0,
      acceptedBookings: statusCounts.accepted || 0,
      revenue,
      totalKwh,
      totalSlots,
      bookedSlots,
      availableSlots,
      occupancyRate,
      peakHour,
      statusCounts,
      hourlyUsage,
      stationPerformance: Object.values(stationPerformance).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (err) {
    console.error('Owner analytics error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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
      .populate('userId', 'name email phone')
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

    // Ensure owner owns this booking (admin can bypass)
    if (req.user.role !== 'admin' && (!booking.ownerId || String(booking.ownerId) !== String(ownerId))) {
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
