// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

/**
 * Helper: validate lat/lng numbers and ranges
 */
function validateLatLng(lat, lng) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return false;
  if (la < -90 || la > 90) return false;
  if (lo < -180 || lo > 180) return false;
  return true;
}

/**
 * POST /api/auth/register
 * body: { name, email, password, phone, role, stationName, stationAddress, stationLat, stationLng }
 * role: 'user' (default) or 'owner'
 */
router.post(
  '/register',
  // basic validation for common fields
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        name = '',
        email,
        password,
        phone = '',
        role = 'user',
        stationName,
        stationAddress,
        stationLat,
        stationLng
      } = req.body;

      if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

      // if owner role, require station info server-side (conditional)
      if (role === 'owner') {
        if (!stationName || !stationAddress || stationLat == null || stationLng == null) {
          return res.status(400).json({ message: 'Owner must provide stationName, stationAddress, stationLat and stationLng' });
        }// server/routes/auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

/**
 * Helper: validate latitude and longitude ranges
 */
function isValidLat(lat) {
  return typeof lat === 'number' && lat >= -90 && lat <= 90;
}
function isValidLng(lng) {
  return typeof lng === 'number' && lng >= -180 && lng <= 180;
}

/**
 * POST /api/auth/register
 * body: { name, email, password, phone, role, stationName, stationAddress, stationLat, stationLng }
 * role: 'user' (default) or 'owner'
 */
router.post(
  '/register',
  // basic validation
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  async (req, res) => {
    try {
      // express-validator errors (basic checks)
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const {
        name = '',
        email,
        password,
        phone = '',
        role = 'user',
        stationName,
        stationAddress,
        stationLat,
        stationLng
      } = req.body;

      if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

      // if owner, ensure station fields present & valid
      if (role === 'owner') {
        if (!stationName || stationName.toString().trim() === '') {
          return res.status(400).json({ message: 'stationName is required for owner accounts' });
        }
        // require lat & lng
        const latNum = stationLat !== undefined && stationLat !== null ? Number(stationLat) : NaN;
        const lngNum = stationLng !== undefined && stationLng !== null ? Number(stationLng) : NaN;
        if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
          return res.status(400).json({ message: 'Valid stationLat and stationLng are required for owner accounts' });
        }
        if (!isValidLat(latNum) || !isValidLng(lngNum)) {
          return res.status(400).json({ message: 'stationLat or stationLng out of range' });
        }
      }

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already used' });

      const hash = await bcrypt.hash(password, 10);

      // build user data
      const userData = {
        name,
        email,
        phone,
        passwordHash: hash,
        role: role === 'owner' ? 'owner' : 'user'
      };

      // attach station info only for owners
      if (role === 'owner') {
        userData.stationName = stationName;
        userData.stationAddress = stationAddress || '';
        userData.stationLocation = {
          type: 'Point',
          coordinates: [Number(stationLng), Number(stationLat)] // [lng, lat]
        };
      }

      const user = await User.create(userData);

      // include role in token so frontend can check it without extra request
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      // return user details incl. station info for convenience (only if owner)
      const userResp = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
      if (user.role === 'owner') {
        userResp.stationName = user.stationName;
        userResp.stationAddress = user.stationAddress;
        userResp.stationLocation = user.stationLocation;
      }

      res.json({
        token,
        user: userResp
      });
    } catch (err) {
      console.error('Register error:', err);
      // if mongoose validation fails (schema required for owner), surface the message
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/auth/login
 * body: { email, password }
 * returns token and user (including role and station info if owner)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    const userResp = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    if (user.role === 'owner') {
      userResp.stationName = user.stationName;
      userResp.stationAddress = user.stationAddress;
      userResp.stationLocation = user.stationLocation;
    }

    res.json({
      token,
      user: userResp
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

        if (!validateLatLng(stationLat, stationLng)) {
          return res.status(400).json({ message: 'Invalid station latitude/longitude' });
        }
      }

      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already used' });

      const hash = await bcrypt.hash(password, 10);

      // prepare user data; include station fields only when owner
      const userData = {
        name,
        email,
        phone,
        passwordHash: hash,
        role: role === 'owner' ? 'owner' : 'user'
      };

      if (role === 'owner') {
        userData.stationName = stationName;
        userData.stationAddress = stationAddress;
        userData.stationLocation = {
          type: 'Point',
          coordinates: [Number(stationLng), Number(stationLat)]
        };
      }

      const user = await User.create(userData);

      // include role in token so frontend can check it without extra request
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role }
      });
    } catch (err) {
      console.error('Register error:', err);
      // handle mongoose validation errors more clearly
      if (err.name === 'ValidationError') {
        return res.status(400).json({ message: err.message });
      }
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * POST /api/auth/login
 * body: { email, password }
 * returns token and user (including role)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
