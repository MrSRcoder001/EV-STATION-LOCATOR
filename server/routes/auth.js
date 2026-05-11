// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const Station = require('../models/Station');
const Slot = require('../models/Slot');

const router = express.Router();

/**
 * Helper: validate latitude &  
 */
function validateLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  return (
    Number.isFinite(la) &&
    Number.isFinite(lo) &&
    la >= -90 &&
    la <= 90 &&
    lo >= -180 &&
    lo <= 180
  );
}

/**
 * POST /api/auth/register
 */
router.post(
  '/register',
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().isLength({ min: 10, max: 15 }).withMessage('Phone number must be between 10 and 15 digits'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        name = '',
        email,
        password,
        phone = '',
        alternatePhone = '',
        role = 'user',
        stationName,
        stationAddress,
        stationLat,
        stationLng
      } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password required' });
      }

      // Owner validation - REMOVED mandatory station check
      // if (role === 'owner') {
      //   if (!stationName || !stationAddress || !stationAddress.city) {
      //     return res.status(400).json({ message: 'Station details required for owner' });
      //   }
      //   if (!validateLatLng(stationLat, stationLng)) {
      //     return res.status(400).json({ message: 'Invalid station latitude/longitude' });
      //   }
      // }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already used' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const userData = {
        name,
        email,
        phone,
        alternatePhone,
        passwordHash,
        role: role === 'owner' ? 'owner' : 'user',
        ownerVerification: role === 'owner' ? { status: 'pending', submittedAt: new Date() } : undefined
      };

      // Only add station details if they are provided
      if (role === 'owner' && stationName && stationAddress) {
        userData.stationName = stationName;
        userData.stationAddress = {
          city: stationAddress.city || '',
          pincode: stationAddress.pincode || '',
          village: stationAddress.village || '',
          area: stationAddress.area || '',
          fullAddress: stationAddress.fullAddress || '',
        };
        // only if lat/lng are valid
        if (validateLatLng(stationLat, stationLng)) {
          userData.stationLocation = {
            type: 'Point',
            coordinates: [Number(stationLng), Number(stationLat)]
          };
        }
      }

      const user = await User.create(userData);

      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      const userResp = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        alternatePhone: user.alternatePhone, // return it
        profileImage: user.profileImage
      };

      if (user.role === 'owner' && user.stationName) {
        userResp.stationName = user.stationName;
        userResp.stationAddress = user.stationAddress;
        userResp.stationLocation = user.stationLocation;

        // Create the Station document IF station details provided
        try {
          const newStation = await Station.create({
            ownerId: user._id,
            name: user.stationName,
            address: user.stationAddress,
            location: user.stationLocation,
            approvalStatus: 'pending',
            type: 'Public',
            chargers: [{ type: 'Normal', count: 1 }],
            openTime: '06:00',
            closeTime: '22:00',
            amenities: [],
            images: [],
            phone: user.phone, // Pass user phone to station
            email: user.email // Pass user email to station
          });

          // Generate slots for this new station (7 days)
          const now = new Date();
          const daysAhead = 7;
          const slotMinutes = 60;
          const startHour = 6;
          const endHour = 22;
          const createdSlots = [];

          const baseDate = new Date(now);
          baseDate.setHours(0, 0, 0, 0);

          for (let day = 0; day < daysAhead; day++) {
            for (let h = startHour; h < endHour; h++) {
              const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + day, h, 0, 0);
              if (start < now) continue;
              const end = new Date(start.getTime() + slotMinutes * 60000);

              createdSlots.push({
                stationId: newStation._id,
                chargerIndex: 0,
                chargerType: 'Normal',
                start,
                end
              });
            }
          }
          if (createdSlots.length > 0) {
            const chunkSize = 1000;
            for (let i = 0; i < createdSlots.length; i += chunkSize) {
              await Slot.insertMany(createdSlots.slice(i, i + chunkSize));
            }
            console.log(`Auto-created station ${newStation._id} and ${createdSlots.length} slots for new owner ${user._id}`);
          }

        } catch (stationErr) {
          console.error('Failed to auto-create station for new owner:', stationErr);
        }
      }

      res.json({ token, user: userResp });

    } catch (err) {
      console.error('Register error:', err);
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Account blocked. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userResp = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({ token, user: userResp });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isBlocked) return res.status(403).json({ message: 'Account blocked' });
    res.json({ user });
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

/**
 * PUT /api/auth/update-profile
 */
router.put('/update-profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { name, phone, alternatePhone, profileImage } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (alternatePhone) user.alternatePhone = alternatePhone;
    if (profileImage) user.profileImage = profileImage;

    await user.save();

    const userResp = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      alternatePhone: user.alternatePhone,
      profileImage: user.profileImage, // return updated image
      stationName: user.stationName
    };

    res.json({ user: userResp, message: 'Profile updated successfully' });

  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/auth/owner-verification
 * Owner submits or updates verification document references.
 */
router.put('/owner-verification', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'owner') return res.status(403).json({ message: 'Owner account required' });

    user.ownerVerification = {
      ...(user.ownerVerification || {}),
      status: 'pending',
      documents: {
        ...(user.ownerVerification?.documents || {}),
        ...(req.body.documents || {})
      },
      submittedAt: new Date(),
      rejectionReason: ''
    };
    await user.save();

    res.json({ message: 'Verification submitted', ownerVerification: user.ownerVerification });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;  
