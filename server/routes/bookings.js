const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Station = require('../models/Station');
const auth = require('../middlewares/authMiddleware');
const router = express.Router();

// Create booking (concurrency-safe using atomic update with a pre-generated ObjectId)
router.post('/', auth, async (req, res) => {
  try {
    const { stationId, chargerIndex, slotIndex } = req.body;
    if (!stationId || chargerIndex == null || slotIndex == null) return res.status(400).json({ message: 'Missing fields' });

    // generate booking id to use in atomic update
    const bookingId = new mongoose.Types.ObjectId();

    // try to atomically set the slot to booked if currently free
    const filter = {
      _id: stationId,
      [`chargers.${chargerIndex}.slots.${slotIndex}.isBooked`]: false
    };
    const update = {
      $set: {
        [`chargers.${chargerIndex}.slots.${slotIndex}.isBooked`]: true,
        [`chargers.${chargerIndex}.slots.${slotIndex}.bookingId`]: bookingId
      }
    };

    const resUpdate = await Station.updateOne(filter, update);
    if (resUpdate.modifiedCount === 0) {
      return res.status(409).json({ message: 'Slot already booked' });
    }

    // create booking record with same _id
    const slot = (await Station.findById(stationId)).chargers[chargerIndex].slots[slotIndex];
    const booking = await Booking.create({
      _id: bookingId,
      userId: req.user.id,
      stationId,
      chargerIndex,
      slotIndex,
      start: slot.start,
      end: slot.end
    });

    res.json({ booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my bookings
router.get('/me', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).populate('stationId', 'name address');
    res.json(bookings);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

// Cancel booking
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    if (String(booking.userId) !== String(req.user.id)) return res.status(403).json({ message: 'Not allowed' });

    // free slot atomically
    const stationId = booking.stationId;
    const chargerIndex = booking.chargerIndex;
    const slotIndex = booking.slotIndex;

    const filter = {
      _id: stationId,
      [`chargers.${chargerIndex}.slots.${slotIndex}.bookingId`]: booking._id
    };
    const update = {
      $set: {
        [`chargers.${chargerIndex}.slots.${slotIndex}.isBooked`]: false,
        [`chargers.${chargerIndex}.slots.${slotIndex}.bookingId`]: null
      }
    };
    await Station.updateOne(filter, update);
    booking.status = 'CANCELLED';
    await booking.save();
    res.json({ message: 'Cancelled' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
});

module.exports = router;
