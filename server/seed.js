// server/seed.js
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');

const Station = require('./models/Station');
const Slot = require('./models/Slot');
const User = require('./models/User');

const uri = process.env.MONGODB_URI;

const SEED_OWNER_EMAIL = 'maharashtra.owner@example.com';
const SEED_OWNER_PASSWORD = 'Owner@12345';

const SEED_ADMIN_EMAIL = 'superadmin@example.com';
const SEED_ADMIN_PASSWORD = 'SuperAdmin@12345';

const maharashtraStations = [
  {
    district: 'Ahmednagar',
    city: 'Ahmednagar',
    area: 'Maliwada',
    pincode: '414001',
    coordinates: [74.7496, 19.0952],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Akola',
    city: 'Akola',
    area: 'Ramdaspeth',
    pincode: '444001',
    coordinates: [77.0082, 20.7059],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Amravati',
    city: 'Amravati',
    area: 'Rajapeth',
    pincode: '444601',
    coordinates: [77.7796, 20.9374],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Bharat AC-001', count: 2 }]
  },
  {
    district: 'Aurangabad',
    city: 'Chhatrapati Sambhajinagar',
    area: 'CIDCO',
    pincode: '431003',
    coordinates: [75.3433, 19.8762],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 4 }]
  },
  {
    district: 'Beed',
    city: 'Beed',
    area: 'Jalna Road',
    pincode: '431122',
    coordinates: [75.7601, 18.9891],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 2 }]
  },
  {
    district: 'Bhandara',
    city: 'Bhandara',
    area: 'Takiya Ward',
    pincode: '441904',
    coordinates: [79.6570, 21.1702],
    chargerMix: [{ type: 'Type2 AC', count: 3 }, { type: 'Bharat AC-001', count: 2 }]
  },
  {
    district: 'Buldhana',
    city: 'Buldhana',
    area: 'Sangam Chowk',
    pincode: '443001',
    coordinates: [76.1842, 20.5293],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Chandrapur',
    city: 'Chandrapur',
    area: 'Civil Lines',
    pincode: '442401',
    coordinates: [79.2961, 19.9615],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 2 }]
  },
  {
    district: 'Dhule',
    city: 'Dhule',
    area: 'Deopur',
    pincode: '424002',
    coordinates: [74.7749, 20.9042],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Gadchiroli',
    city: 'Gadchiroli',
    area: 'Complex Area',
    pincode: '442605',
    coordinates: [80.0030, 20.1849],
    chargerMix: [{ type: 'Type2 AC', count: 2 }, { type: 'Bharat AC-001', count: 2 }]
  },
  {
    district: 'Gondia',
    city: 'Gondia',
    area: 'Rail Toly',
    pincode: '441601',
    coordinates: [80.1961, 21.4598],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Hingoli',
    city: 'Hingoli',
    area: 'Akola Road',
    pincode: '431513',
    coordinates: [77.1485, 19.7179],
    chargerMix: [{ type: 'Type2 AC', count: 3 }, { type: 'Bharat AC-001', count: 1 }]
  },
  {
    district: 'Jalgaon',
    city: 'Jalgaon',
    area: 'Ganesh Colony',
    pincode: '425001',
    coordinates: [75.5626, 21.0077],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Jalna',
    city: 'Jalna',
    area: 'Ambad Road',
    pincode: '431203',
    coordinates: [75.8864, 19.8347],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Kolhapur',
    city: 'Kolhapur',
    area: 'Tarabai Park',
    pincode: '416003',
    coordinates: [74.2433, 16.7050],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 4 }]
  },
  {
    district: 'Latur',
    city: 'Latur',
    area: 'Ausa Road',
    pincode: '413512',
    coordinates: [76.5604, 18.4088],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Mumbai City',
    city: 'Mumbai',
    area: 'Fort',
    pincode: '400001',
    coordinates: [72.8347, 18.9388],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 4 }, { type: 'Type2 AC', count: 6 }]
  },
  {
    district: 'Mumbai Suburban',
    city: 'Mumbai',
    area: 'Andheri East',
    pincode: '400069',
    coordinates: [72.8697, 19.1136],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 4 }, { type: 'Type2 AC', count: 6 }]
  },
  {
    district: 'Nagpur',
    city: 'Nagpur',
    area: 'Civil Lines',
    pincode: '440001',
    coordinates: [79.0882, 21.1458],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 3 }, { type: 'Type2 AC', count: 5 }]
  },
  {
    district: 'Nanded',
    city: 'Nanded',
    area: 'Vazirabad',
    pincode: '431601',
    coordinates: [77.3119, 19.1383],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Nandurbar',
    city: 'Nandurbar',
    area: 'Navapur Road',
    pincode: '425412',
    coordinates: [74.2428, 21.3756],
    chargerMix: [{ type: 'Type2 AC', count: 3 }, { type: 'Bharat AC-001', count: 1 }]
  },
  {
    district: 'Nashik',
    city: 'Nashik',
    area: 'Gangapur Road',
    pincode: '422013',
    coordinates: [73.7898, 19.9975],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 3 }, { type: 'Type2 AC', count: 5 }]
  },
  {
    district: 'Osmanabad',
    city: 'Dharashiv',
    area: 'Barshi Road',
    pincode: '413501',
    coordinates: [76.0420, 18.1861],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Palghar',
    city: 'Palghar',
    area: 'Boisar Road',
    pincode: '401404',
    coordinates: [72.7559, 19.6967],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Parbhani',
    city: 'Parbhani',
    area: 'Station Road',
    pincode: '431401',
    coordinates: [76.7751, 19.2608],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Pune',
    city: 'Pune',
    area: 'Shivajinagar',
    pincode: '411005',
    coordinates: [73.8567, 18.5204],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 4 }, { type: 'Type2 AC', count: 6 }]
  },
  {
    district: 'Raigad',
    city: 'Alibag',
    area: 'Pen Road',
    pincode: '402201',
    coordinates: [72.8777, 18.6414],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Ratnagiri',
    city: 'Ratnagiri',
    area: 'Maruti Mandir',
    pincode: '415612',
    coordinates: [73.3120, 16.9902],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Sangli',
    city: 'Sangli',
    area: 'Vishrambag',
    pincode: '416416',
    coordinates: [74.5815, 16.8524],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 4 }]
  },
  {
    district: 'Satara',
    city: 'Satara',
    area: 'Powai Naka',
    pincode: '415001',
    coordinates: [74.0183, 17.6805],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 4 }]
  },
  {
    district: 'Sindhudurg',
    city: 'Oros',
    area: 'Kudal Road',
    pincode: '416812',
    coordinates: [73.6869, 16.1700],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Solapur',
    city: 'Solapur',
    area: 'Saat Rasta',
    pincode: '413001',
    coordinates: [75.9064, 17.6599],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 2 }, { type: 'Type2 AC', count: 4 }]
  },
  {
    district: 'Thane',
    city: 'Thane',
    area: 'Majiwada',
    pincode: '400601',
    coordinates: [72.9781, 19.2183],
    chargerMix: [{ type: 'CCS2 DC Fast', count: 4 }, { type: 'Type2 AC', count: 5 }]
  },
  {
    district: 'Wardha',
    city: 'Wardha',
    area: 'Bachelor Road',
    pincode: '442001',
    coordinates: [78.6022, 20.7453],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  },
  {
    district: 'Washim',
    city: 'Washim',
    area: 'Risod Road',
    pincode: '444505',
    coordinates: [77.1330, 20.1113],
    chargerMix: [{ type: 'Type2 AC', count: 3 }, { type: 'Bharat AC-001', count: 1 }]
  },
  {
    district: 'Yavatmal',
    city: 'Yavatmal',
    area: 'Arni Road',
    pincode: '445001',
    coordinates: [78.1204, 20.3899],
    chargerMix: [{ type: 'Bharat DC-001', count: 1 }, { type: 'Type2 AC', count: 3 }]
  }
];

function buildSlots(stationId, chargers, startHour = 6, endHour = 22, slotMinutes = 60, daysAhead = 7) {
  const slots = [];
  const now = new Date();
  const baseDate = new Date(now);
  baseDate.setHours(0, 0, 0, 0);

  for (let day = 0; day < daysAhead; day += 1) {
    for (let hour = startHour; hour < endHour; hour += 1) {
      for (let minute = 0; minute < 60; minute += slotMinutes) {
        const start = new Date(
          baseDate.getFullYear(),
          baseDate.getMonth(),
          baseDate.getDate() + day,
          hour,
          minute,
          0
        );

        if (start < now) continue;

        const end = new Date(start.getTime() + slotMinutes * 60000);

        chargers.forEach((charger, chargerIndex) => {
          for (let copy = 0; copy < charger.count; copy += 1) {
            slots.push({
              stationId,
              chargerIndex,
              chargerType: charger.type,
              start,
              end,
              isBooked: false
            });
          }
        });
      }
    }
  }

  return slots;
}

function stationDocumentFromSeed(seed, ownerId, index) {
  const pricePerKwh = 14 + (index % 5) * 2;

  return {
    ownerId,
    name: `${seed.district} EV Charge Hub`,
    address: {
      city: seed.city,
      pincode: seed.pincode,
      village: '',
      area: seed.area,
      fullAddress: `${seed.area}, ${seed.city}, ${seed.district}, Maharashtra ${seed.pincode}`
    },
    phone: `900000${String(index + 1).padStart(4, '0')}`,
    email: `${seed.district.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.ev@example.com`,
    type: 'Public',
    chargers: seed.chargerMix.map(charger => ({
      type: charger.type,
      count: charger.count,
      isActive: true
    })),
    amenities: ['Parking', 'Restroom', 'Cafe', 'Waiting Area'],
    openTime: '06:00',
    closeTime: '22:00',
    pricePerKwh,
    pricing: {
      basePrice: pricePerKwh,
      peakMultiplier: 1.5
    },
    status: 'Active',
    approvalStatus: 'approved',
    approvedAt: new Date(),
    fraudRiskScore: 0,
    isMaintenance: false,
    images: [],
    location: {
      type: 'Point',
      coordinates: seed.coordinates
    }
  };
}

async function seed() {
  if (!uri) {
    throw new Error('MONGODB_URI is missing. Add it to server/.env before running seed.');
  }

  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash(SEED_OWNER_PASSWORD, 10);
  const owner = await User.findOneAndUpdate(
    { email: SEED_OWNER_EMAIL },
    {
      $setOnInsert: {
        name: 'Maharashtra EV Sample Owner',
        email: SEED_OWNER_EMAIL,
        passwordHash,
        phone: '9000000000',
        role: 'owner',
        ownerVerification: { status: 'verified', reviewedAt: new Date() }
      }
    },
    { upsert: true, new: true }
  );

  const oldSeedStations = await Station.find({ ownerId: owner._id }).select('_id');
  const oldStationIds = oldSeedStations.map(station => station._id);

  if (oldStationIds.length > 0) {
    await Slot.deleteMany({ stationId: { $in: oldStationIds } });
    await Station.deleteMany({ _id: { $in: oldStationIds } });
  }

  const stationDocs = maharashtraStations.map((seedData, index) =>
    stationDocumentFromSeed(seedData, owner._id, index)
  );

  const createdStations = await Station.insertMany(stationDocs);

  const slotDocs = createdStations.flatMap(station => buildSlots(station._id, station.chargers));
  const chunkSize = 1000;

  for (let index = 0; index < slotDocs.length; index += chunkSize) {
    await Slot.insertMany(slotDocs.slice(index, index + chunkSize));
  }

  console.log(`Seeded owner: ${SEED_OWNER_EMAIL} / ${SEED_OWNER_PASSWORD}`);
  
  const adminPasswordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);
  await User.findOneAndUpdate(
    { email: SEED_ADMIN_EMAIL },
    {
      $setOnInsert: {
        name: 'Super Admin',
        email: SEED_ADMIN_EMAIL,
        passwordHash: adminPasswordHash,
        phone: '9999999999',
        role: 'admin'
      }
    },
    { upsert: true }
  );
  console.log(`Seeded admin: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`);

  console.log(`Seeded ${createdStations.length} Maharashtra stations.`);
  console.log(`Seeded ${slotDocs.length} charging slots.`);
}

seed()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect();
    process.exit(1);
  });
