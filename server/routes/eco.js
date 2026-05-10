const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const User = require('../models/User');

// @route   GET /api/eco
// @desc    Get current user's eco impact details
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({ ecoStats: user.ecoStats || { co2Saved: 0, fuelCostSaved: 0 } });
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching eco stats' });
    }
});

module.exports = router;
