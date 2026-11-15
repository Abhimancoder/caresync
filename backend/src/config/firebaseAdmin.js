import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

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

try {
  if (admin.apps.length === 0) {
    if (keyPath) {
      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ [Firebase Admin] Initialized with Service Account Key file.');
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
      console.log('✅ [Firebase Admin] Initialized with Google Cloud Project ID (ADC).');
    } else {
      console.warn('⚠️ [Firebase Admin] No Firebase credentials or Project ID detected.');
      console.warn('ℹ️ [Firebase Admin] Initializing demo fallback for local development & evaluation.');
      admin.initializeApp({
        projectId: 'caresync-demo-project',
      });
    }
  }

  db = admin.firestore();
  auth = admin.auth();
} catch (err) {
  console.warn('⚠️ [Firebase Admin] Initialization warning:', err.message);
  isMockDb = true;
}

export { admin, db, auth, isMockDb };
export default admin;
