const express = require('express');
const router = express.Router();
const auth = require('../middlewares/authMiddleware');

const User = require('../models/User');
const Station = require('../models/Station');
const Booking = require('../models/Booking');
const FaultReport = require('../models/FaultReport');
const EmergencyRequest = require('../models/EmergencyRequest');

// Simple admin middleware
const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
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
        const faultsCount = await FaultReport.countDocuments({ status: { $ne: 'Resolved' } });
        const carbonResult = await Booking.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, co2SavedKg: { $sum: { $multiply: ['$chargedKwh', 0.85] } } } }
        ]);

        res.json({
            revenue: revenueResult[0] ? revenueResult[0].totalRevenue : 0,
            totalKwh: revenueResult[0] ? revenueResult[0].totalKwh : 0,
            co2SavedKg: carbonResult[0] ? carbonResult[0].co2SavedKg : 0,
            bookingsByStatus: bookingsStatus,
            activeFaults: faultsCount
        });
    } catch (err) {
        console.error('Admin analytics error:', err);
        res.status(500).json({ message: 'Server error on analytics endpoint', error: err.message });
    }
});

// GET /api/admin/owners/pending
router.get('/owners/pending', async (req, res) => {
    const owners = await User.find({
        role: 'owner',
        'ownerVerification.status': { $in: ['pending', 'not_submitted'] }
    }).select('-passwordHash').sort({ createdAt: -1 });
    res.json(owners);
});

// PUT /api/admin/owners/:id/verification
router.put('/owners/:id/verification', async (req, res) => {
    const { status, rejectionReason = '' } = req.body;
    if (!['verified', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'Invalid verification status' });
    }
    const owner = await User.findOne({ _id: req.params.id, role: 'owner' });
    if (!owner) return res.status(404).json({ message: 'Owner not found' });
    owner.ownerVerification = {
        ...(owner.ownerVerification || {}),
        status,
        rejectionReason,
        reviewedAt: new Date(),
        reviewedBy: req.user.id
    };
    await owner.save();
    res.json({ message: `Owner ${status}`, owner });
});

// PUT /api/admin/stations/:id/approval
router.put('/stations/:id/approval', async (req, res) => {
    const { status, notes = '', fraudRiskScore } = req.body;
    if (!['pending', 'approved', 'rejected', 'flagged'].includes(status)) {
        return res.status(400).json({ message: 'Invalid approval status' });
    }
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: 'Station not found' });
    station.approvalStatus = status;
    station.approvalNotes = notes;
    station.fraudRiskScore = fraudRiskScore !== undefined ? Number(fraudRiskScore) : station.fraudRiskScore;
    if (status === 'approved') {
        station.approvedAt = new Date();
        station.approvedBy = req.user.id;
    }
    await station.save();
    res.json({ message: `Station ${status}`, station });
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

        user.isBlocked = req.body.isBlocked !== undefined ? Boolean(req.body.isBlocked) : !user.isBlocked;
        user.blockedReason = req.body.reason || user.blockedReason || '';
        await user.save();
        res.json({ message: user.isBlocked ? 'User blocked' : 'User unblocked', user });
    } catch (err) {
        res.status(500).json({ message: 'Server error on blocking user' });
    }
});

router.get('/complaints', async (req, res) => {
    const complaints = await FaultReport.find()
        .populate('userId', 'name email phone')
        .populate('stationId', 'name address ownerId')
        .sort({ createdAt: -1 })
        .limit(200);
    res.json(complaints);
});

router.put('/complaints/:id', async (req, res) => {
    const complaint = await FaultReport.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    if (req.body.status) complaint.status = req.body.status;
    if (req.body.adminNotes !== undefined) complaint.adminNotes = req.body.adminNotes;
    await complaint.save();
    res.json(complaint);
});

router.get('/emergency', async (req, res) => {
    const requests = await EmergencyRequest.find()
        .populate('userId', 'name phone email')
        .populate('stationId', 'name address')
        .sort({ createdAt: -1 })
        .limit(200);
    res.json(requests);
});

router.get('/reports/summary', async (req, res) => {
    const [users, owners, stations, approvedStations, bookings, paid] = await Promise.all([
        User.countDocuments({ role: 'user' }),
        User.countDocuments({ role: 'owner' }),
        Station.countDocuments(),
        Station.countDocuments({ approvalStatus: 'approved' }),
        Booking.countDocuments(),
        Booking.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, revenue: { $sum: '$amount' }, kwh: { $sum: '$chargedKwh' } } }
        ])
    ]);
    res.json({
        generatedAt: new Date(),
        users,
        owners,
        stations,
        approvedStations,
        bookings,
        revenue: paid[0]?.revenue || 0,
        kwh: paid[0]?.kwh || 0,
        co2SavedKg: (paid[0]?.kwh || 0) * 0.85
    });
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
