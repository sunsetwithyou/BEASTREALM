// Check if Firebase app is already initialized
import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase only if it hasn't been initialized yet
if (!getApps().length) {
  const app = initializeApp(firebaseConfig);
} else {
  const app = getApps()[0]; // Use the already initialized app
}

// Now you can use the app
const db = getFirestore(app);