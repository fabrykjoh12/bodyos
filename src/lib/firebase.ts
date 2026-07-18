import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

// ---------------------------------------------------------------------------
// Firebase client for optional cloud sync (email/password auth + Firestore).
//
// Like every Firebase browser app, the config below is PUBLIC by design — it
// ships in the client bundle. Access is protected by Firestore security rules
// (owner-only on the `bodyos_app_state` collection), not by hiding the config,
// so it is safe to commit. No server or build-time secret is required, which
// keeps the GitHub Pages deploy a plain static build.
//
// Chosen over Supabase because Firebase email/password sign-in logs you in
// immediately (no email-confirmation step), so account creation "just works".
//
// The SDK (~firebase/app + auth + firestore) is imported *dynamically* so it
// stays out of the initial bundle — sync isn't needed for first paint.
//
// >>> To enable: paste your Firebase web-app config here. In the Firebase
//     console: Project settings → General → Your apps → SDK setup → Config. <<<
// ---------------------------------------------------------------------------

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyC8HWzbReeW_vRoYKt8qNlJAy4WnYyI-PY',
  authDomain: 'bodyos-e7372.firebaseapp.com',
  projectId: 'bodyos-e7372',
  appId: '1:596389728089:web:3e6fad1ff9d6645c470648',
  // storageBucket / messagingSenderId are optional for auth + Firestore.
  storageBucket: 'bodyos-e7372.firebasestorage.app',
  messagingSenderId: '596389728089',
};

export const isFirebaseConfigured =
  FIREBASE_CONFIG.apiKey.length > 0 && FIREBASE_CONFIG.projectId.length > 0;

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let clientPromise: Promise<FirebaseClient | null> | null = null;

/** Lazily import + memoize the Firebase client. Resolves null if unconfigured. */
export function loadFirebase(): Promise<FirebaseClient | null> {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = (async () => {
      const [{ initializeApp }, { getAuth }, { getFirestore }] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      return { app, auth: getAuth(app), db: getFirestore(app) };
    })();
  }
  return clientPromise;
}
