const API = 'http://localhost:5000/api';

async function runTests() {
    console.log("Starting End-to-End API verification...");

    const ts = Date.now();
    let token = null;
    let ownerId = null;

    try {
        console.log("1. Registering new Owner...");
        const regRes = await fetch(`${API}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: `TestOwner_${ts}`,
                email: `owner_${ts}@test.com`,
                phone: "9876543210",
                password: "password123",
                role: "owner"
            })
        });
        if (!regRes.ok) throw new Error(await regRes.text());
        console.log("   ✅ Registration successful.");

        console.log("2. Logging in...");
        const loginRes = await fetch(`${API}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: `owner_${ts}@test.com`,
                password: "password123"
            })
        });
        if (!loginRes.ok) throw new Error(await loginRes.text());
        const loginData = await loginRes.json();
        token = loginData.token;
        ownerId = loginData.user.id;
        console.log("   ✅ Login successful. Token received.");

    } catch (err) {
        console.error("❌ Auth Failed:", err.message);
        return;
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
    let stationId = null;

    try {
        console.log("3. Creating a Station...");
        const stRes = await fetch(`${API}/owner/stations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: `SuperCharger ${ts}`,
                lat: 18.5204,
                lng: 73.8567,
                address: { city: "Pune", fullAddress: "Test Address" },
                pricePerKwh: 15,
                chargers: [{ type: "Fast", count: 2 }]
            })
        });
        if (!stRes.ok) throw new Error(await stRes.text());
        const stData = await stRes.json();
        stationId = stData._id;
        console.log(`   ✅ Station created. ID: ${stationId}`);
    } catch (err) {
        console.error("❌ Station Creation Failed:", err.message);
        return;
    }

    try {
        console.log("4. Testing Nearby Stations Search...");
        const nearRes = await fetch(`${API}/stations/nearby?lat=18.520&lng=73.856`);
        if (!nearRes.ok) throw new Error(await nearRes.text());
        const nearData = await nearRes.json();
        if (nearData.length > 0) {
            console.log(`   ✅ Found ${nearData.length} nearby stations.`);
        } else {
            console.log("   ⚠️ No nearby stations found in range.");
        }
    } catch (err) {
        console.error("❌ Nearby Search Failed:", err.message);
    }

    try {
        console.log("5. Testing Wait Time Estimation...");
        const waitRes = await fetch(`${API}/stations/${stationId}/waiting-time`);
        if (!waitRes.ok) throw new Error(await waitRes.text());
        const waitData = await waitRes.json();
        console.log(`   ✅ Wait Time response: Wait: ${waitData.waitTime} mins, Free Slots: ${waitData.freeCount}`);
    } catch (err) {
        console.error("❌ Wait Time Check Failed:", err.message);
    }

    try {
        console.log("6. Testing Admin Validation (should block Owner)...");
        const adminRes = await fetch(`${API}/admin/stats`, { headers });
        if (adminRes.status === 403) {
            console.log("   ✅ Admin access successfully blocked for non-admins (403 returned).");
        } else {
            console.error(`❌ Unexpected Admin API status: ${adminRes.status}`);
        }
    } catch (err) {
        console.error("❌ Admin Test Failed:", err.message);
    }

    console.log("All Backend API Tests Completed.");
}

runTests();
