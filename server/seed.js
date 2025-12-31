// server/seed.js
require('dotenv').config();
const mongoose = require('mongoose');
const Station = require('./models/Station');

const uri = process.env.MONGODB_URI;
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

function generateSlotsForDays(startHour = 8, endHour = 22, slotMinutes = 30, days = 3) {
  const slots = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += slotMinutes) {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d, h, m, 0);
        const end = new Date(start.getTime() + slotMinutes * 60000);
        slots.push({ start, end, isBooked: false, bookingId: null });
      }
    }
  }
  return slots;
}

async function seed() {
  try {
    await Station.deleteMany({});
    const locations = [
      { name: 'Pune EV Station 1', coords: [73.8567, 18.5204] }, // [lng, lat]
      { name: 'Pune EV Station 2', coords: [73.8650, 18.5250] },
      { name: 'Pune EV Station 3', coords: [73.8410, 18.5150] }
    ];
    for (const loc of locations) {
      const station = await Station.create({
        name: loc.name,
        address: 'Sample address, Pune',
        location: { type: 'Point', coordinates: loc.coords },
        chargers: [
          { type: 'AC', powerKw: 7.4, slots: generateSlotsForDays(8, 22, 30, 3) },
          { type: 'DC', powerKw: 50, slots: generateSlotsForDays(8, 22, 30, 3) }
        ],
        phone: '0000000000',
        images: []
      });
      console.log('Created', station.name);
    }
    console.log('Seeding done');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
seed();
