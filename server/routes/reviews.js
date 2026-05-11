const express = require('express');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Station = require('../models/Station');
const auth = require('../middlewares/authMiddleware');

const router = express.Router();

async function refreshStationRating(stationId) {
  const stats = await Review.aggregate([
    { $match: { stationId } },
    { $group: { _id: '$stationId', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const rating = stats[0] || { average: 0, count: 0 };
  await Station.findByIdAndUpdate(stationId, {
    ratingAverage: Math.round(Number(rating.average || 0) * 10) / 10,
    reviewCount: rating.count || 0
  });
}

router.get('/stations/:stationId/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ stationId: req.params.stationId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/stations/:stationId/reviews', auth, async (req, res) => {
  try {
    const { rating, comment = '', bookingId } = req.body;
    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (bookingId) {
      const booking = await Booking.findOne({
        _id: bookingId,
        userId: req.user.id,
        stationId: req.params.stationId,
        status: 'completed'
      });
      if (!booking) return res.status(400).json({ message: 'Only completed bookings can be reviewed' });
    }

    const review = await Review.create({
      stationId: req.params.stationId,
      bookingId,
      userId: req.user.id,
      rating: numericRating,
      comment
    });
    await refreshStationRating(review.stationId);
    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Review already submitted' });
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
