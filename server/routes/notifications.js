const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const Notification = require('../models/Notification');

// @route   GET /api/notifications
// @desc    Get current user's notifications (including broad ones)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notifications = await Notification.find({
            $or: [{ userId: req.user.id }, { userId: null }]
        }).sort({ createdAt: -1 }).limit(20);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Server error fetching notifications' });
    }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { read: true },
            { new: true }
        );
        res.json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Server error marking notification read' });
    }
});

// @route   POST /api/notifications
// @desc    Admin send general notification
// @access  Private Admin
router.post('/', authMiddleware, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const { title, message, type, targetedUserId } = req.body;
        const notification = new Notification({
            userId: targetedUserId || null,
            title,
            message,
            type: type || 'info'
        });
        await notification.save();

        // Broadcast via socket io
        const io = req.app.get('io');
        if (io) {
            if (targetedUserId) {
                io.to(`user:${targetedUserId}`).emit('notification', notification);
            } else {
                io.emit('notification', notification); // to all
            }
        }

        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Server error creating notification' });
    }
});

module.exports = router;
