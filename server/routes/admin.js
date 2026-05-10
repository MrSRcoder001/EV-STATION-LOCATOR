const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');

const User = require('../models/User');
const Station = require('../models/Station');
const Booking = require('../models/Booking');

// Simple admin middleware
const adminMiddleware = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'owner')) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Admin only.' });
    }
};

router.use(auth);
router.use(adminMiddleware);

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalStations = await Station.countDocuments();
        const totalBookings = await Booking.countDocuments();
        const pendingBookings = await Booking.countDocuments({ status: 'pending' });

        res.json({
            totalUsers,
            totalStations,
            totalBookings,
            pendingBookings
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/analytics
// Provides aggregation data for revenue and bookings
router.get('/analytics', async (req, res) => {
    try {
        // Total revenue
        const revenueResult = await Booking.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' }, totalKwh: { $sum: '$chargedKwh' } } }
        ]);

        // Bookings per status
        const bookingsStatus = await Booking.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        // Faults count
        const FaultReport = require('../models/FaultReport');
        const faultsCount = await FaultReport.countDocuments({ status: { $ne: 'Resolved' } });

        res.json({
            revenue: revenueResult[0] ? revenueResult[0].totalRevenue : 0,
            totalKwh: revenueResult[0] ? revenueResult[0].totalKwh : 0,
            bookingsByStatus: bookingsStatus,
            activeFaults: faultsCount
        });
    } catch (err) {
        console.error('Admin analytics error:', err);
        res.status(500).json({ message: 'Server error on analytics endpoint', error: err.message });
    }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/stations
router.get('/stations', async (req, res) => {
    try {
        const stations = await Station.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
        res.json(stations);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// GET /api/admin/bookings
router.get('/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find()
            .populate('userId', 'name email profileImage')
            .populate('stationId', 'name address')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// PUT /api/admin/users/:id/block
router.put('/users/:id/block', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.role === 'admin') return res.status(400).json({ message: 'Cannot block admin' });

        user.isBlocked = !user.isBlocked;
        await user.save();
        res.json({ message: user.isBlocked ? 'User blocked' : 'User unblocked', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error on blocking user' });
    }
});

// PUT /api/admin/bookings/:id/force-stop
router.put('/bookings/:id/force-stop', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });

        booking.status = 'cancelled';
        booking.meta = { ...booking.meta, forceStopped: true, stoppedAt: new Date() };
        await booking.save();
        res.json({ message: 'Session forcefully stopped', booking });
    } catch (err) {
        res.status(500).json({ message: 'Server error on force stopping' });
    }
});

module.exports = router;
