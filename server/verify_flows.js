require('dotenv').config();

const bcrypt = require('bcrypt');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const User = require('./models/User');

const PORT = Number(process.env.VERIFY_PORT || 5055);
const BASE = `http://127.0.0.1:${PORT}/api`;
const ADMIN_EMAIL = 'superadmin@example.com';
const ADMIN_PASSWORD = 'SuperAdmin@12345';

function log(step) {
  console.log(`[verify] ${step}`);
}

async function ensureAdmin() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing in server/.env');
  await mongoose.connect(process.env.MONGODB_URI);
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: ADMIN_EMAIL },
    {
      $setOnInsert: {
        name: 'Super Admin',
        email: ADMIN_EMAIL,
        phone: '9999999999',
        passwordHash,
        role: 'admin'
      }
    },
    { upsert: true }
  );
  await mongoose.disconnect();
}

function startServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['server.js'], {
      cwd: __dirname,
      env: { ...process.env, PORT: String(PORT) },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Server did not start in time'));
    }, 20000);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      if (text.includes(`http://localhost:${PORT}`)) {
        clearTimeout(timeout);
        resolve(child);
      }
    });

    child.stderr.on('data', (chunk) => process.stderr.write(chunk.toString()));
    child.on('exit', (code) => {
      if (code && code !== 0) reject(new Error(`Server exited with code ${code}`));
    });
  });
}

async function request(path, { method = 'GET', token, body, expectedStatus } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (err) {
    throw new Error(`${method} ${path} returned non-JSON ${res.status}: ${text.slice(0, 120)}`);
  }
  if (expectedStatus && res.status === expectedStatus) return data;
  if (!res.ok) {
    throw new Error(`${method} ${path} failed ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function run() {
  await ensureAdmin();
  const server = await startServer();
  const suffix = Date.now();

  try {
    log('login admin');
    const admin = await request('/auth/login', {
      method: 'POST',
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });

    log('register owner and user');
    const owner = await request('/auth/register', {
      method: 'POST',
      body: {
        name: `Verify Owner ${suffix}`,
        email: `verify.owner.${suffix}@example.com`,
        password: 'Owner@12345',
        phone: '9876543210',
        role: 'owner'
      }
    });
    const user = await request('/auth/register', {
      method: 'POST',
      body: {
        name: `Verify User ${suffix}`,
        email: `verify.user.${suffix}@example.com`,
        password: 'User@12345',
        phone: '9876500000',
        role: 'user'
      }
    });

    log('auth profile APIs');
    await request('/auth/me', { token: user.token });
    await request('/auth/update-profile', {
      method: 'PUT',
      token: user.token,
      body: { name: `Updated User ${suffix}`, phone: '9876500001', alternatePhone: '9876500002' }
    });
    await request('/auth/owner-verification', {
      method: 'PUT',
      token: owner.token,
      body: { documents: { gstNumber: `GST${suffix}`, governmentId: 'verified-doc-ref' } }
    });
    await request('/admin/owners/pending', { token: admin.token });

    log('admin verifies owner');
    await request(`/admin/owners/${owner.user.id}/verification`, {
      method: 'PUT',
      token: admin.token,
      body: { status: 'verified' }
    });

    log('owner creates station');
    const station = await request('/owner/stations', {
      method: 'POST',
      token: owner.token,
      body: {
        name: `Verify Charge Hub ${suffix}`,
        address: { city: 'Pune', area: 'Shivajinagar', fullAddress: 'Shivajinagar, Pune' },
        phone: '9000000001',
        email: `verify.station.${suffix}@example.com`,
        lat: 18.5204,
        lng: 73.8567,
        chargers: [{ type: 'CCS2 DC Fast', count: 1 }],
        pricePerKwh: 20
      }
    });

    const hiddenStation = await request('/owner/stations', {
      method: 'POST',
      token: owner.token,
      body: {
        name: `Hidden Pending Station ${suffix}`,
        address: { city: 'Pune', area: 'Pending Area', fullAddress: 'Pending Area, Pune' },
        phone: '9000000002',
        email: `hidden.station.${suffix}@example.com`,
        lat: 18.521,
        lng: 73.857,
        chargers: [{ type: 'Type2 AC', count: 1 }],
        pricePerKwh: 18
      }
    });

    log('admin approves station');
    await request(`/admin/stations/${station._id}/approval`, {
      method: 'PUT',
      token: admin.token,
      body: { status: 'approved', notes: 'Verified by smoke test' }
    });

    log('owner station REST APIs');
    await request('/owner/stations', { token: owner.token });
    await request(`/owner/stations/${station._id}`, { token: owner.token });
    await request(`/owner/stations/${station._id}`, {
      method: 'PUT',
      token: owner.token,
      body: {
        name: station.name,
        address: station.address,
        phone: station.phone,
        email: station.email,
        lat: 18.5204,
        lng: 73.8567,
        chargers: station.chargers,
        pricePerKwh: 21,
        status: 'Active',
        dynamicPricing: { enabled: true, minPrice: 18, maxPrice: 30 }
      }
    });
    await request(`/owner/stations/${station._id}/chargers/0/status`, {
      method: 'PUT',
      token: owner.token,
      body: { isActive: false }
    });
    await request(`/owner/stations/${station._id}/chargers/0/status`, {
      method: 'PUT',
      token: owner.token,
      body: { isActive: true }
    });
    await request(`/owner/stations/${station._id}/slots`, {
      method: 'POST',
      token: owner.token,
      body: { regenerate: true, slotMinutes: 60, daysAhead: 7 }
    });
    await request(`/owner/stations/${hiddenStation._id}`, {
      method: 'DELETE',
      token: owner.token
    });

    log('user sees station nearby and books slot');
    const nearby = await request('/stations/nearby?lat=18.5204&lng=73.8567&maxDistance=5000');
    if (!nearby.some((item) => String(item._id) === String(station._id))) {
      throw new Error('Approved station not visible in nearby search');
    }
    const search = await request(`/stations/search?q=${encodeURIComponent(station.name)}`);
    if (!search.some((item) => String(item._id) === String(station._id))) {
      throw new Error('Approved station not visible in search');
    }
    await request(`/stations/${station._id}/waiting-time`);
    await request(`/stations/${station._id}/owner-slots`);
    const slots = await request(`/stations/${station._id}/slots`);
    if (!slots.length) throw new Error('No generated slots found');
    const createdBooking = await request('/bookings', {
      method: 'POST',
      token: user.token,
      body: { slotId: slots[0]._id }
    });
    const cancelBooking = await request('/bookings', {
      method: 'POST',
      token: user.token,
      body: { slotId: slots[1]._id }
    });
    await request(`/bookings/${cancelBooking.bookingId}`, {
      method: 'DELETE',
      token: user.token
    });

    log('owner accepts booking');
    await request(`/owner/bookings/${createdBooking.bookingId}/decision`, {
      method: 'PUT',
      token: owner.token,
      body: { action: 'accept' }
    });
    await request('/bookings/owner', { token: owner.token });
    await request('/owner/bookings', { token: owner.token });

    log('user pays, checks in, completes session');
    await request(`/bookings/${createdBooking.bookingId}/pay`, {
      method: 'POST',
      token: user.token,
      body: { amount: 100 }
    });
    const myBookings = await request('/bookings/me', { token: user.token });
    const booking = myBookings.find((item) => String(item._id) === String(createdBooking.bookingId));
    if (!booking?.qrCode) throw new Error('Booking QR code missing');
    await request('/sessions/check-in', {
      method: 'POST',
      token: owner.token,
      body: { bookingId: booking._id, qrCode: booking.qrCode, meterStartKwh: 5 }
    });
    await request(`/sessions/${booking._id}/progress`, {
      method: 'PUT',
      token: owner.token,
      body: { meterCurrentKwh: 11 }
    });
    await request(`/sessions/${booking._id}/complete`, {
      method: 'PUT',
      token: owner.token,
      body: { meterEndKwh: 12 }
    });

    log('user review, fault, wallet, eco, emergency');
    await request('/wallet/top-up', { method: 'POST', token: user.token, body: { amount: 250 } });
    await request(`/stations/${station._id}/reviews`, {
      method: 'POST',
      token: user.token,
      body: { bookingId: booking._id, rating: 5, comment: 'Smoke test review' }
    });
    await request(`/stations/${station._id}/reviews`);
    const fault = await request('/faults', {
      method: 'POST',
      token: user.token,
      body: { stationId: station._id, description: 'Smoke test fault report' }
    });
    await request('/wallet', { token: user.token });
    await request('/eco', { token: user.token });
    const emergency = await request('/emergency', {
      method: 'POST',
      token: user.token,
      body: {
        lat: 18.5204,
        lng: 73.8567,
        batteryPercent: 8,
        connectorType: 'CCS2 DC Fast',
        note: 'Smoke test emergency'
      }
    });
    await request('/emergency/me', { token: user.token });
    await request('/emergency/owner', { token: owner.token });
    await request(`/emergency/${emergency._id}/status`, {
      method: 'PUT',
      token: admin.token,
      body: { status: 'on_the_way' }
    });

    log('admin and owner can monitor connected data');
    const adminBookings = await request('/admin/bookings', { token: admin.token });
    if (!adminBookings.some((item) => String(item._id) === String(booking._id))) {
      throw new Error('Admin cannot see completed booking');
    }
    const ownerAnalytics = await request('/owner/bookings/analytics', { token: owner.token });
    if (!ownerAnalytics.bookings) throw new Error('Owner analytics did not count booking');
    const adminEmergency = await request('/admin/emergency', { token: admin.token });
    if (!adminEmergency.length) throw new Error('Admin emergency monitor returned no records');
    await request('/admin/stats', { token: admin.token });
    await request('/admin/analytics', { token: admin.token });
    await request('/admin/users', { token: admin.token });
    await request('/admin/stations', { token: admin.token });
    await request('/admin/complaints', { token: admin.token });
    await request(`/admin/complaints/${fault._id}`, {
      method: 'PUT',
      token: admin.token,
      body: { status: 'In Progress', adminNotes: 'Smoke test note' }
    });
    await request(`/faults/${fault._id}/resolve`, { method: 'PUT', token: admin.token });
    await request('/faults', { token: admin.token });
    await request('/admin/reports/summary', { token: admin.token });
    await request(`/admin/bookings/${booking._id}/force-stop`, { method: 'PUT', token: admin.token });

    log('notification REST APIs');
    const directNotification = await request('/notifications', {
      method: 'POST',
      token: admin.token,
      body: { title: 'Smoke direct', message: 'Direct notification', targetedUserId: user.user.id }
    });
    await request('/notifications/broadcast', {
      method: 'POST',
      token: admin.token,
      body: { title: 'Smoke broadcast', message: 'Broadcast notification' }
    });
    await request('/notifications', { token: user.token });
    await request(`/notifications/${directNotification._id}/read`, {
      method: 'PUT',
      token: user.token
    });

    log('admin block/unblock API');
    await request(`/admin/users/${user.user.id}/block`, {
      method: 'PUT',
      token: admin.token,
      body: { isBlocked: true, reason: 'Smoke test' }
    });
    await request('/auth/login', {
      method: 'POST',
      body: { email: user.user.email, password: 'User@12345' },
      expectedStatus: 403
    });
    await request(`/admin/users/${user.user.id}/block`, {
      method: 'PUT',
      token: admin.token,
      body: { isBlocked: false }
    });

    log('PASS: admin, owner, and user flows are connected');
  } finally {
    server.kill();
  }
}

run().catch((err) => {
  console.error('[verify] FAIL:', err.message);
  process.exit(1);
});
