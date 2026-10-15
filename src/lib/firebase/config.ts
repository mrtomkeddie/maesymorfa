
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Local testing only: NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true sends everything to the Firebase
// emulators on this computer, under a "demo-" project that cannot reach the live database.
export const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';

const projectId = useEmulators ? 'demo-morfaconnect' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: useEmulators ? 'demo-key' : process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId,
  // The live site has no bucket setting, so fall back to the project's default bucket
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || (projectId ? `${projectId}.firebasestorage.app` : undefined),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// True when the site has a Firebase project to talk to. Without one, the data layer
// falls back to the built-in sample data (local previews only).
export const isFirebaseConfigured = !!firebaseConfig.projectId && !!firebaseConfig.apiKey;

// The admin area's no-sign-in demo mode: only on a local preview with no Firebase project.
// A live site with missing settings gets a locked admin area instead.
export const isLocalDemo = !isFirebaseConfigured && process.env.NODE_ENV === 'development';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

if (useEmulators) {
  // Connect each instance once. Hot reload runs this file again with the same instances, and
  // the server can hold more than one copy of Firebase, each with its own instances.
  const flags = globalThis as { __morfaEmulatorConnected?: WeakSet<object> };
  const connected = (flags.__morfaEmulatorConnected ??= new WeakSet());
  if (!connected.has(db)) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connected.add(db);
  }
  if (!connected.has(storage)) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
    connected.add(storage);
  }
}

export { app, db, storage };
