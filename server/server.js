// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
// example lines that must exist
const ownerStationsRoutes = require('./routes/stations');

// near your existing route mounts:

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/owner/stations', ownerStationsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('Connected to MongoDB');
    app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
