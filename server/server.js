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
const slotsRoutes = require('./routes/slots');
// near your existing route mounts:
const http = require('http');
const { Server } = require('socket.io');
const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/owner/stations', ownerStationsRoutes);
app.use('/api/stations', ownerStationsRoutes);
app.use('/api/auth', authRoutes);
// app.use('/api/owner/bookings', bookingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owner/bookings', require('./routes/owner/bookings'));

app.use('/api', slotsRoutes);


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', methods: ['GET','POST'] } // adjust origin
});
app.set('io', io);

// when client connects
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);

  // client should emit 'auth:join' with their user id and role after login
  socket.on('auth:join', (payload) => {
    // payload = { userId, role } role = 'owner' or 'user'
    if (!payload || !payload.userId) return;
    const uid = String(payload.userId);
    if (payload.role === 'owner') {
      socket.join(`owner:${uid}`);
      console.log(`${socket.id} joined owner:${uid}`);
    } else {
      socket.join(`user:${uid}`);
      console.log(`${socket.id} joined user:${uid}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> {
    console.log('Connected to MongoDB');
    app.listen(PORT, ()=> console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
