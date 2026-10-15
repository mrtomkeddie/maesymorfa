'use client';

import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { app, db, useEmulators } from './config';

// Who may edit the school website: each admin has a document at admins/{their user ID},
// added by hand in the Firebase console. Signing in alone gives no access (see firestore.rules).

let auth: Auth | null = null;

export function getSchoolAuth(): Auth {
  if (!auth) {
    auth = getAuth(app);
    if (useEmulators && !auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
  }
  return auth;
}

export async function isAdmin(user: User): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

// Signs in, then signs straight back out if the account is not a school admin
export async function signInAdmin(email: string, password: string): Promise<'ok' | 'not-admin'> {
  const cred = await signInWithEmailAndPassword(getSchoolAuth(), email, password);
  if (await isAdmin(cred.user)) return 'ok';
  await signOut(getSchoolAuth());
  return 'not-admin';
}

// Calls back with the signed-in user (or null) and whether they are an admin. Returns the unsubscribe function.
// An admin check that finishes after a newer sign-in or sign-out is thrown away, so a slow answer
// can never bring back a signed-out user or act on the wrong account.
export function watchAdmin(callback: (state: { user: User | null; admin: boolean }) => void) {
  let latestCheck = 0;
  let active = true;
  const unsubscribe = onAuthStateChanged(getSchoolAuth(), async (user) => {
    const check = ++latestCheck;
    const admin = user ? await isAdmin(user) : false;
    if (!active || check !== latestCheck || getSchoolAuth().currentUser?.uid !== user?.uid) return;
    callback({ user, admin });
  });
  return () => {
    active = false;
    unsubscribe();
  };
}

export const signOutAdmin = () => signOut(getSchoolAuth());

export const sendAdminPasswordReset = (email: string) => sendPasswordResetEmail(getSchoolAuth(), email);

// Proves to the site's own API routes that the request comes from a signed-in admin
export async function adminIdToken(): Promise<string | null> {
  const user = getSchoolAuth().currentUser;
  return user ? user.getIdToken() : null;
}
