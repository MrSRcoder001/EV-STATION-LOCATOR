// server/routes/slots.js
const express = require('express');
const Slot = require('../models/Slot');
const router = express.Router();

// /**
//  * GET /api/stations/:id/slots?from=&to=&onlyFree=true
//  */
router.get('/stations/:id/slots', async (req, res) => {
  try {
    const stationId = req.params.id;
    const from = req.query.from ? new Date(req.query.from) : new Date();
    const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // default 7 days
    const onlyFree = req.query.onlyFree !== 'false'; // default true

    const filter = {
      stationId,
      start: { $gte: from, $lt: to }
    };
    if (onlyFree) filter.isBooked = false;

    const slots = await Slot.find(filter).sort({ start: 1, chargerIndex: 1 }).limit(1000);
    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
