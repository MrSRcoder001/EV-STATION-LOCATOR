const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const FaultReport = require('../models/FaultReport');
const Notification = require('../models/Notification');

// @route   POST /api/faults
// @desc    Report a new fault
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { stationId, description } = req.body;
        const newFault = new FaultReport({
            userId: req.user.id,
            stationId,
            description
        });
        await newFault.save();

        // Create an alert for admins
        const notification = new Notification({
            title: 'New Fault Report',
            message: `A new fault has been reported for station ${stationId}.`,
            type: 'fault'
        });
        await notification.save();

        // Broadcast via socket could be added here by retrieving the app's io instance
        // const io = req.app.get('io');
        // if(io) io.emit('admin:fault_alert', notification);

        res.status(201).json(newFault);
    } catch (error) {
        res.status(500).json({ error: 'Server error reporting fault' });
    }
});

// @route   GET /api/faults
// @desc    Get all faults (Admin)
// @access  Private Admin
router.get('/', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const faults = await FaultReport.find().populate('userId', 'name email').populate('stationId', 'name address');
        res.json(faults);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching faults' });
    }
});

// @route   PUT /api/faults/:id
// @desc    Update fault status
// @access  Private Admin
router.put('/:id', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { status, adminNotes } = req.body;
        const fault = await FaultReport.findByIdAndUpdate(
            req.params.id,
            { status, adminNotes },
            { new: true }
        );
        if (!fault) return res.status(404).json({ message: 'Fault not found' });

        // Notify the user about resolution
        if (status === 'Resolved') {
            const notification = new Notification({
                userId: fault.userId,
                title: 'Fault Resolved',
                message: `Your reported fault at station has been marked as resolved. Notes: ${adminNotes}`,
                type: 'info'
            });
            await notification.save();
        }

        res.json(fault);
    } catch (error) {
        res.status(500).json({ error: 'Server error updating fault' });
    }
});

router.put('/:id/resolve', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const fault = await FaultReport.findByIdAndUpdate(
            req.params.id,
            { status: 'Resolved', adminNotes: req.body.adminNotes || 'Resolved by admin' },
            { new: true }
        );
        if (!fault) return res.status(404).json({ message: 'Fault not found' });
        res.json(fault);
    } catch (error) {
        res.status(500).json({ error: 'Server error resolving fault' });
    }
});

module.exports = router;
