import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

/**
 * CareSync In-Memory Firestore Mock
 * Provides seamless zero-configuration local development and evaluation
 * when Google Cloud credentials or serviceAccountKey.json are not present.
 */
class InMemoryCollection {
  constructor(name, storage) {
    this.name = name;
    this.storage = storage;
    if (!this.storage[name]) {
      this.storage[name] = new Map();
    }
  }

  doc(id) {
    const colName = this.name;
    const storage = this.storage;

    return {
      id,
      async get() {
        const item = storage[colName].get(id);
        return {
          id,
          exists: Boolean(item),
          data: () => (item ? { ...item } : undefined),
        };
      },
      async set(data) {
        storage[colName].set(id, { id, ...data });
        return { id };
      },
      async update(data) {
        const existing = storage[colName].get(id) || {};
        storage[colName].set(id, { ...existing, ...data });
        return { id };
      },
      async delete() {
        storage[colName].delete(id);
        return true;
      },
    };
  }

  where(field, op, val) {
    return new InMemoryQuery(this.name, this.storage, [{ field, op, val }]);
  }

  orderBy(field, direction = 'asc') {
    return new InMemoryQuery(this.name, this.storage, [], { field, direction });
  }

  limit(limitCount) {
    return new InMemoryQuery(this.name, this.storage, [], null, limitCount);
  }

  async get() {
    return new InMemoryQuery(this.name, this.storage).get();
  }
}

class InMemoryQuery {
  constructor(name, storage, filters = [], sort = null, limitCount = null) {
    this.name = name;
    this.storage = storage;
    this.filters = filters;
    this.sort = sort;
    this.limitCount = limitCount;
  }

  where(field, op, val) {
    return new InMemoryQuery(
      this.name,
      this.storage,
      [...this.filters, { field, op, val }],
      this.sort,
      this.limitCount
    );
  }

  orderBy(field, direction = 'asc') {
    return new InMemoryQuery(this.name, this.storage, this.filters, { field, direction }, this.limitCount);
  }

  limit(limitCount) {
    return new InMemoryQuery(this.name, this.storage, this.filters, this.sort, limitCount);
  }

  async get() {
    let items = Array.from(this.storage[this.name]?.values() || []);

    // Apply where filters
    for (const f of this.filters) {
      items = items.filter((item) => {
        const val = item[f.field];
        if (f.op === '==') return val === f.val;
        if (f.op === '!=') return val !== f.val;
        if (f.op === '>') return val > f.val;
        if (f.op === '>=') return val >= f.val;
        if (f.op === '<') return val < f.val;
        if (f.op === '<=') return val <= f.val;
        if (f.op === 'array-contains') return Array.isArray(val) && val.includes(f.val);
        return true;
      });
    }

    // Apply order by
    if (this.sort) {
      const { field, direction } = this.sort;
      items.sort((a, b) => {
        const valA = a[field] || '';
        const valB = b[field] || '';
        if (valA < valB) return direction === 'desc' ? 1 : -1;
        if (valA > valB) return direction === 'desc' ? -1 : 1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount && this.limitCount > 0) {
      items = items.slice(0, this.limitCount);
    }

    const docs = items.map((data) => ({
      id: data.id,
      exists: true,
      data: () => ({ ...data }),
    }));

    return {
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach(callback) {
        docs.forEach(callback);
      },
    };
  }
}

class InMemoryFirestore {
  constructor() {
    this.storage = {};
  }

  collection(name) {
    return new InMemoryCollection(name, this.storage);
  }
}

// -------------------------------------------------------------
// Initialize Firebase Admin (Real or Local Fallback)
// -------------------------------------------------------------

let db = null;
let auth = null;
let isMockDb = false;

// Check for service account key file
const defaultKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const customKeyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : null;

const keyPath = customKeyPath && fs.existsSync(customKeyPath)
  ? customKeyPath
  : fs.existsSync(defaultKeyPath)
  ? defaultKeyPath
  : null;

// True if running inside Google Cloud Run (where ADC is native) or explicitly has credentials
const isCloudRun = Boolean(process.env.K_SERVICE || process.env.GOOGLE_APPLICATION_CREDENTIALS);
const hasRealCredentials = Boolean(keyPath || (isCloudRun && process.env.FIREBASE_PROJECT_ID));

if (hasRealCredentials) {
  try {
    if (admin.apps.length === 0) {
      if (keyPath) {
        const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
        });
        console.log('✅ [Firebase Admin] Connected to Google Cloud Firestore via Service Account Key.');
      } else {
        admin.initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID,
        });
        console.log('✅ [Firebase Admin] Connected to Google Cloud Firestore via Application Default Credentials (ADC).');
      }
    }
    db = admin.firestore();
    auth = admin.auth();
    isMockDb = false;
  } catch (err) {
    console.warn('⚠️ [Firebase Admin] Live connection failed. Falling back to local in-memory store:', err.message);
    db = new InMemoryFirestore();
    isMockDb = true;
  }
} else {
  console.log('ℹ️ [CareSync Database] Running in Zero-Config Local Development Mode (In-Memory Firestore Active).');
  console.log('💡 [Notice] To connect to a live Google Cloud Firestore project, place serviceAccountKey.json in the project root or deploy to Cloud Run.');
  db = new InMemoryFirestore();
  isMockDb = true;
}

// Seed the initial demo profile into the database
async function seedInitialData() {
  const profileRef = db.collection('elderlyProfiles').doc('demo-profile-robert');
  const existing = await profileRef.get();
  if (!existing.exists) {
    await profileRef.set({
      id: 'demo-profile-robert',
      elderlyUserId: 'demo-elderly-robert',
      fullName: 'Robert Harrison',
      age: 78,
      dateOfBirth: '1948-06-12',
      bloodGroup: 'O+',
      allergies: ['Penicillin', 'Sulfa drugs'],
      emergencyContacts: [
        {
          name: 'Sarah Jenkins',
          relationship: 'Daughter / Nurse & Primary Caregiver',
          phone: '+1-555-0199',
          isPrimary: true,
        },
        {
          name: 'Michael Harrison',
          relationship: 'Son',
          phone: '+1-555-0144',
          isPrimary: false,
        },
      ],
      authorizedMembers: [
        {
          userId: 'demo-caretaker-sarah',
          name: 'Sarah Jenkins',
          role: 'caretaker',
          joinedAt: '2026-11-15T08:00:00Z',
        },
        {
          userId: 'demo-family-michael',
          name: 'Michael Harrison',
          role: 'family',
          joinedAt: '2026-11-15T09:00:00Z',
        },
      ],
      medicalNotes: 'Diagnosed with mild hypertension and type 2 diabetes. Manages daily regimen with caregiver assistance.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Seed default medications
    await db.collection('medications').doc('med-demo-1').set({
      id: 'med-demo-1',
      profileId: 'demo-profile-robert',
      name: 'Lisinopril',
      dosage: '10',
      unit: 'mg',
      form: 'tablet',
      instructions: 'Take 1 tablet every morning with a glass of water after breakfast.',
      prescribingDoctor: 'Dr. Angela Martinez, MD (Cardiology)',
      frequency: 'once_daily',
      scheduledTimes: ['08:00'],
      startDate: '2026-11-01',
      endDate: '2027-11-01',
      isActive: true,
      createdAt: '2026-11-01T08:00:00Z',
    });

    await db.collection('medications').doc('med-demo-2').set({
      id: 'med-demo-2',
      profileId: 'demo-profile-robert',
      name: 'Metformin',
      dosage: '500',
      unit: 'mg',
      form: 'tablet',
      instructions: 'Take 1 tablet twice daily with meals.',
      prescribingDoctor: 'Dr. Sarah Al-Mansoor, MD (Endocrinology)',
      frequency: 'twice_daily',
      scheduledTimes: ['08:30', '19:30'],
      startDate: '2026-11-01',
      endDate: '2027-11-01',
      isActive: true,
      createdAt: '2026-11-01T08:00:00Z',
    });

    // Seed default appointment
    await db.collection('appointments').doc('appt-demo-1').set({
      id: 'appt-demo-1',
      profileId: 'demo-profile-robert',
      doctorName: 'Dr. Angela Martinez',
      specialty: 'Cardiology',
      hospitalClinic: 'St. Jude Memorial Health Pavilion, Suite 402',
      appointmentDate: '2026-11-20',
      appointmentTime: '14:30',
      appointmentTimestamp: '2026-11-20T14:30:00.000Z',
      notes: 'Routine hypertension follow-up. Bring recent blood pressure logs and medication list.',
      status: 'upcoming',
      reminderSent: false,
      createdAt: '2026-11-10T10:00:00Z',
    });
  }
}

seedInitialData().catch((err) => {
  console.warn('Seed data initialization note:', err.message);
});

export { admin, db, auth, isMockDb, hasRealCredentials };
export default admin;
