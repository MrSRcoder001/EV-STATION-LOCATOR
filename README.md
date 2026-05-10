# ⚡ AI-Powered EV Charging Station Locator & Smart Management System

Welcome to the **Next-Gen EV Charging Network**. This project actively resolves the biggest real-world challenges faced by electric vehicle owners and station administrators through a scalable MERN stack architecture enriched with Real-Time WebSockets and AI-driven logic.

---

## 🛠️ Real-Life Problems Solved (User Features)

### 1. 🔋 Real-Time Station Status (MOST IMPORTANT)
* **Problem:** Users arrive at a station only to find out it's full, out of order, or under maintenance.
* **Our Solution:** Show Live Availability of slots, occupied slots, and maintenance status natively using Real-Time Data (Socket.io).
* **Explanation:** *"Users can see live availability of charging points, reducing wasted trips and wait times."*

### 2. ⏳ Smart Waiting Time Prediction (AI Logic)
* **Problem:** Uncertainty regarding how long the queue is.
* **Our Solution:** Estimate waiting time using current bookings, average charging duration, and historical data. *(Formula: `waitingTime = (carsAhead × avgChargingTime) - freeSlots`)*
* **Explanation:** *"The system predicts waiting time so users can choose the best station."*

### 3. 🚗 Battery Range + Safe Route Planning
* **Problem:** Range anxiety (Fear of battery dying).
* **Our Solution:** System calculates safe routes and required charging stops based on user's current battery % and vehicle type.
* **Explanation:** *"Ensures the user never runs out of battery during long trips."*

### 4. 📍 Smart Station Recommendation (Ranking System)
* **Problem:** Which station is best?
* **Our Solution:** Ranks stations based on Distance, Waiting time, Price, and Rating.
* **Explanation:** *"Instead of just listing stations, the system recommends the best optimal option."*

### 5. 🔌 Charger Compatibility Filter
* **Problem:** Not all EVs use the same charging standard.
* **Our Solution:** Filter dynamically by CCS, CHAdeMO, Type 2, etc.
* **Explanation:** *"Prevents users from reaching incompatible charging stations."*

### 6. 💳 Payment Integration
* **Problem:** Payment confusion at physical stations.
* **Our Solution:** Online booking with a Wallet system for immediate digital holds.
* **Explanation:** *"Users can book and pay in advance, ensuring a seamless experience."*

### 7. 🌱 Eco Impact Tracking (⭐ Unique Feature)
* **Our Solution:** Show CO₂ saved and Fuel cost saved actively.
* **Explanation:** *"Encourages sustainable driving behavior."*

---

## 👑 The Admin Dashboard (Powerful Control Center)

To truly manage the grid, this platform features an extensive 11-module administration engine engineered for real-life business deployment:

### 🧠 1. Dashboard Overview
* **What admin sees:** Total stations, Active charging sessions, Available vs occupied slots, Today's bookings, and Revenue. Includes a live heat-map showing station status.
* **Real-life impact:** *"Admin gets a real-time overview of the entire charging network instantly."*

### 🏗️ 2. Station Management (Core Feature)
* **Capabilities:** Add new stations, Edit details (location, pricing, type), and mark statuses (Active, Under Maintenance, Temporarily Closed).
* **Real-life impact:** *"Helps maintain strictly accurate and updated infrastructure data."*

### 🔌 3. Slot & Charger Management
* **Capabilities:** Instead of just stations, control each charger unit individually. Add/remove points, set Charger Type (CCS, Type 2), alter Power (kW), and enable/disable specific slots.
* **Real-life impact:** *"Admin can control each charging unit individually for maximum flexibility."*

### 📅 4. Booking & Session Management
* **Capabilities:** View all bookings, track ongoing & completed sessions, and force-stop an emergency session. Detect overstay users.
* **Real-life impact:** *"Ensures smooth operation and severely avoids misuse of slots."*

### � 5. User Management
* **Capabilities:** View all users, Block/Unblock users, view booking history, and detect spam usage.
* **Real-life impact:** *"Maintains platform security and prevents malicious interference."*

### 📊 6. Analytics & Reports (Data Driven)
* **Capabilities:** Tracks Revenue per day/month, peak usage hours, most utilized stations, and average charging times dynamically.
* **Real-life impact:** *"Helps in crucial data-driven decision making and business growth optimization."*

### 🚨 7. Fault & Issue Management
* **Capabilities:** User reports directly bridge here (Charger offline, slow speed). Admins assign maintenance and mark tickets as resolved.
* **Real-life impact:** *"Drastically improves reliability of the EV infrastructure."*

### 🔔 8. Notification System
* **Capabilities:** Send manual alerts to users (maintenance warnings, offers) and trigger automatic broadcasts (Slot ready, Session complete).

### 💳 9. Pricing & Payment Control
* **Capabilities:** Set specific charging base prices per kWh and leverage **Dynamic Peak Pricing** (price surges during heavy usage hours).
* **Real-life impact:** *"Smart pricing helps actively manage demand."*

### 🛡️ 10. Role-Based Access Control (RBAC)
* **Capabilities:** Segmented permissions across Super Admin, Station Owner, and Operator levels. Admin has full control while owners map only their territory.
* **Real-life impact:** *"Ensures secure and controlled access to heavily sensitive operations."*

### ⚡ 11. Real-Time Monitoring (⭐ Advanced Feature)
* **Capabilities:** Live sockets track active sessions globally. Alerts trigger instantly if a charger goes offline or reports an overload!

---

## 🚀 Advanced Engine Concepts (WINNER Level)
- **🤖 AI Recommendation Engine:** Serves the *"Best station for you right now"*.
- **📡 IoT Integration Paradigm:** Conceptually capable of streaming live charger data from built-in sensors.
- **📶 Offline Mode Compatibility:** Save the last known safe route if internet connectivity drops.

---

### Tech Stack
* **MongoDB & Mongoose:** Highly flexible Document architecture serving complex station arrays, geo-spatial coordinates, and transactional logs.
* **Express.js & Node.js:** Scalable backend hosting aggressive algorithmic routes, Aggregation Pipelines, and Authentication.
* **React.js & TailwindCSS:** Fully responsive, Glassmorphism-themed, component-driven User Interface.
* **Socket.io:** Real-time bi-directional event orchestration (Alerts, Booking locks, Live status).
* **Google Maps API:** Precise routing, dynamic Marker management, and complex Geo-JSON interpretations. 

### ▶️ Run Locally
1. `cd root` -> `npm install` for dependencies.
2. `cd server` -> `npm start` (Runs API on port 5000). Ensure `.env` contains valid `MONGO_URI`.
3. `cd client` -> `npm run dev` (Runs React interface).

---
*Built with ❤️ for a Sustainable Future.*
