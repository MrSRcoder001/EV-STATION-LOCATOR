# EV Station Locator: Complete Working Flow

## 1. EV User Flow

1. Signup/Login
- A user registers through `POST /api/auth/register` with role `user`.
- Login uses `POST /api/auth/login`, returns a JWT and a safe user object.
- The frontend stores the token in `localStorage`; `client/src/api.js` attaches it to every protected API request.
- Socket.io joins the user room as `user:<userId>` after login.

2. Find Station Using GPS
- `Home.jsx` calls browser geolocation through `navigator.geolocation`.
- Current latitude/longitude is sent to `GET /api/stations/nearby?lat=&lng=&maxDistance=`.
- MongoDB uses the `Station.location` `2dsphere` index and `$near` query to return nearest approved stations.

3. Google Maps Integration
- `Home.jsx` uses `@react-google-maps/api`.
- Station coordinates render as map markers.
- Trip planning uses Google `DirectionsService` and `DirectionsRenderer`.
- Search geocoding currently uses Nominatim, while route rendering uses Google Maps.

4. Nearby Station Algorithm
- Backend filters by distance, approval status, charger type, price, and station status.
- Frontend merges database stations with OpenChargeMap results.
- Duplicate stations are removed by comparing station ids and distance between coordinates.
- UI ranking prioritizes low wait time, available slots, and lower price.

5. Real-Time Charger Availability
- Slots are stored in `slots`.
- Availability is computed from unbooked future slots.
- Charger status changes emit `station:availability` through Socket.io.

6. Filters
- Frontend filters stations by all, fast charging, and available now.
- Backend supports `fastCharging=true` and `maxPrice`.

7. Route Planning
- User enters source and destination.
- Frontend geocodes both, fits the route bounds, fetches stations near the route midpoint, and displays ETA/distance.
- Live navigation uses `watchPosition`.

8. Slot Booking
- User selects a DB station.
- Frontend loads `GET /api/stations/:id/slots`.
- User confirms with `POST /api/bookings`.
- Backend atomically marks the slot booked and creates a pending booking with a QR code.
- Owner receives `booking:new` in room `owner:<ownerId>`.

9. Payment
- User pays with `POST /api/bookings/:id/pay`.
- Current implementation is a wallet/mock gateway.
- Wallet balance is debited, booking becomes paid, charged kWh is estimated, and eco stats are updated.

10. QR Check-In
- Booking has `qrCode`.
- Station owner or user validates it with `POST /api/sessions/check-in`.
- Booking moves to `active`; `checkInAt` and `sessionStartedAt` are recorded.

11. Charging Session Tracking
- Progress updates use `PUT /api/sessions/:bookingId/progress`.
- Completion uses `PUT /api/sessions/:bookingId/complete`.
- Socket events `session:progress` and `session:updated` notify user/owner dashboards.

12. Notifications
- Notifications live in `notifications`.
- `GET /api/notifications` returns personal and broadcast notifications.
- Socket events push booking, session, emergency, and admin alerts.

13. Booking History
- User history: `GET /api/bookings/me`.
- Booking includes populated station and slot details.

14. Reviews And Ratings
- Station reviews: `GET /api/stations/:stationId/reviews`.
- Add review: `POST /api/stations/:stationId/reviews`.
- Station `ratingAverage` and `reviewCount` refresh after every review.

15. Emergency Charging Request
- User posts location and battery details to `POST /api/emergency`.
- Backend assigns the nearest approved active station within 25 km when possible.
- Owner and admin receive real-time emergency events.

16. Wallet
- Wallet summary: `GET /api/wallet`.
- Top-up: `POST /api/wallet/top-up`.
- Payment debits create `wallettransactions`.

## User Backend APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `PUT /api/auth/update-profile`
- `GET /api/stations/nearby`
- `GET /api/stations/search`
- `GET /api/stations/:id/slots`
- `POST /api/bookings`
- `GET /api/bookings/me`
- `POST /api/bookings/:id/pay`
- `POST /api/sessions/check-in`
- `PUT /api/sessions/:bookingId/progress`
- `PUT /api/sessions/:bookingId/complete`
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `GET /api/stations/:stationId/reviews`
- `POST /api/stations/:stationId/reviews`
- `POST /api/emergency`
- `GET /api/emergency/me`
- `GET /api/wallet`
- `POST /api/wallet/top-up`

## User Frontend Components

- `Home.jsx`: map, search, filters, route planner, booking modal.
- `NearbyStationsList.jsx`: ranked station list.
- `StationDetailsPane.jsx`: station details and report fault action.
- `BookingModal` logic inside `Home.jsx`: slot selection and booking confirmation.
- `UserProfile.jsx`: profile, wallet, history target page.
- `socket.js`: socket connection and room joining.

## 2. Station Owner Flow

1. Owner Registration
- Owner registers with role `owner`.
- `ownerVerification.status` starts as `pending`.
- If station data is included, an initial station is created with `approvalStatus: pending`.

2. Document Verification
- Owner submits documents with `PUT /api/auth/owner-verification`.
- Admin reviews with `PUT /api/admin/owners/:id/verification`.

3. Station Onboarding
- Owner creates station with `POST /api/owner/stations`.
- Backend validates coordinates, normalizes chargers, stores GeoJSON, and auto-generates seven days of slots.
- Admin approves station with `PUT /api/admin/stations/:id/approval`.

4. Add/Edit/Delete Stations
- List: `GET /api/owner/stations`.
- Create: `POST /api/owner/stations`.
- Update: `PUT /api/owner/stations/:id`.
- Delete: `DELETE /api/owner/stations/:id`.

5. Charger Management
- Chargers are embedded under `Station.chargers`.
- Toggle charger active state with `PUT /api/owner/stations/:id/chargers/:chargerIndex/status`.

6. Slot Management
- Generate slots with `POST /api/owner/stations/:id/slots`.
- Slots support charger index, type, start/end, and booking state.

7. Booking Approval/Rejection
- Owner sees bookings with `GET /api/owner/bookings`.
- Decision endpoint: `PUT /api/owner/bookings/:id/decision`.
- Accept keeps the slot booked; reject frees the slot.

8. Revenue And Analytics
- Owner analytics: `GET /api/owner/bookings/analytics`.
- It returns revenue, kWh, occupancy, peak hour, station performance, and status counts.

9. Dynamic Pricing
- Station has `dynamicPricing`.
- Owner updates pricing fields through station update API.
- Frontend can calculate final price from base price, peak windows, and multipliers.

10. Customer Management
- Owner bookings populate `userId` with name/email/phone.
- This gives customer history per station.

11. Maintenance Mode
- Station update supports `status` and `isMaintenance`.
- Maintenance stations are deprioritized or blocked in the user UI.

12. Charger Status Updates
- Charger toggle emits `station:availability`.
- Future dashboard components can subscribe and update availability live.

## Owner APIs

- `PUT /api/auth/owner-verification`
- `GET /api/owner/stations`
- `POST /api/owner/stations`
- `GET /api/owner/stations/:id`
- `PUT /api/owner/stations/:id`
- `DELETE /api/owner/stations/:id`
- `POST /api/owner/stations/:id/upload`
- `POST /api/owner/stations/:id/slots`
- `PUT /api/owner/stations/:id/chargers/:chargerIndex/status`
- `GET /api/owner/bookings`
- `PUT /api/owner/bookings/:id/decision`
- `GET /api/owner/bookings/analytics`
- `GET /api/emergency/owner`
- `PUT /api/emergency/:id/status`

## Owner Dashboard Architecture

- `OwnerLayout.jsx`: protected owner shell/navigation.
- `OwnerDashboard.jsx`: operational summary.
- `OwnerStations.jsx`: station CRUD.
- `OwnerOperations.jsx`: bookings, slot, charger, emergency operations.
- `OwnerAnalytics.jsx`: revenue, occupancy, usage, and performance charts.

## 3. Super Admin Flow

1. Admin Authentication
- Admin logs in through the same auth flow.
- Admin endpoints require JWT and `role === 'admin'`.

2. Owner Verification
- Pending owners: `GET /api/admin/owners/pending`.
- Verify/reject: `PUT /api/admin/owners/:id/verification`.

3. Station Approval
- All stations: `GET /api/admin/stations`.
- Approval decision: `PUT /api/admin/stations/:id/approval`.
- Approved stations become visible in nearby search.

4. Fraud Detection
- Station has `fraudRiskScore` and `approvalStatus: flagged`.
- Admin can flag suspicious stations based on duplicate coordinates, missing documents, high complaint count, or fake pricing.

5. Complaint Management
- Complaints/faults: `GET /api/admin/complaints`.
- Update complaint: `PUT /api/admin/complaints/:id`.

6. Monitoring Bookings And Chargers
- Bookings: `GET /api/admin/bookings`.
- Active chargers are inferred from stations, chargers, and active bookings.
- Force stop: `PUT /api/admin/bookings/:id/force-stop`.

7. Analytics
- `GET /api/admin/stats` gives counts.
- `GET /api/admin/analytics` gives revenue, kWh, CO2 saved, booking statuses, and fault count.

8. Carbon Analytics
- CO2 saved is estimated from charged kWh.
- Current formula: `chargedKwh * 0.85`.

9. Emergency Alerts
- Admin emergency list: `GET /api/admin/emergency`.
- New emergency requests emit `admin:emergency`.

10. Ban System
- `PUT /api/admin/users/:id/block` toggles or sets blocked status.
- Login rejects blocked accounts.

11. Reports
- `GET /api/admin/reports/summary` returns export-ready totals for users, owners, stations, bookings, revenue, kWh, and CO2.

## Admin Frontend Pages

- `AdminLayout.jsx`: admin shell.
- `AdminDashboard.jsx`: platform analytics.
- `AdminStations.jsx`: station monitoring and approval target.
- `AdminUsers.jsx`: user/owner management.
- `AdminSessions.jsx`: active bookings/session monitoring.
- `AdminAlerts.jsx`: complaints and emergency target.
- `AdminStationForm.jsx`: station create/edit form reused by admin/owner.

## 4. Database Collections

- `users`: users, owners, admins, wallet, block state, owner verification documents.
- `stations`: owner station profile, GeoJSON location, chargers, approval, ratings, dynamic pricing.
- `slots`: charger slot inventory.
- `bookings`: booking lifecycle, payment, QR, session state, kWh.
- `notifications`: user and broadcast messages.
- `faultreports`: complaints and charger/station faults.
- `reviews`: rating and comment per station/user/booking.
- `emergencyrequests`: urgent charging requests and assignment.
- `wallettransactions`: wallet ledger.

## 5. System Architecture

Frontend
- React + Vite.
- Axios API client with JWT interceptor.
- Google Maps for map and directions.
- Socket.io client for real-time booking, session, availability, emergency, and notification events.
- Separate user, owner, and admin route groups.

Backend
- Express API.
- JWT authentication middleware.
- Role middleware for owner/admin permissions.
- Mongoose models and MongoDB geospatial queries.
- Socket.io attached to the HTTP server.

API Flow
- Frontend calls `/api/...`.
- API validates JWT where required.
- Route checks role and resource ownership.
- Mongoose reads/writes MongoDB.
- Route emits Socket.io event when state changes.
- Frontend updates dashboard/list/map state.

Authentication Flow
- Register/login returns JWT signed with `JWT_SECRET`.
- Client stores token.
- Axios sends `Authorization: Bearer <token>`.
- Backend sets `req.user`.
- Role-based routes check `req.user.role`.

WebSocket Flow
- Client connects to Socket.io.
- Client emits `auth:join` with `{ userId, role }`.
- Server joins `user:<id>` or `owner:<id>`.
- Admin/global events use broadcast events.

Deployment
- Frontend can deploy to Vercel/Netlify.
- Backend can deploy to Render/Railway/AWS.
- MongoDB Atlas should hold production data.
- Required env vars: `MONGODB_URI`, `JWT_SECRET`, frontend map keys, and allowed CORS origin.

Scalability
- MongoDB indexes: station geospatial, slots by station/start, reviews by station, emergency geospatial.
- Use Redis adapter for Socket.io when running multiple backend instances.
- Move payment from mock wallet to Razorpay/Stripe order and webhook verification.
- Move file uploads to S3/Cloudinary.
- Add background jobs for slot generation, stale booking release, reminders, and reports.
