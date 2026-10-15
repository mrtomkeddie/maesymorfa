// Sets up the local Firebase emulators for testing the admin area. Emulators only: it never
// touches the live project.
//
// 1. firebase emulators:start --project demo-morfaconnect
// 2. node scripts/seed-emulator.mjs
// 3. Sign in at http://localhost:9002/admin/login with the admin account below.
//
// These are throwaway test accounts that exist only inside the emulator.
export const TEST_ADMIN = { email: 'office@morfa.test', password: 'Emu-office-7Kq2vR' };
export const TEST_NON_ADMIN = { email: 'stranger@morfa.test', password: 'Emu-stranger-3Lp9xW' };

const PROJECT = 'demo-morfaconnect';
const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`;

async function createUser({ email, password }) {
    const res = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`Could not create ${email}: ${JSON.stringify(data.error)}`);
    return data.localId;
}

// Start clean so the script can be run again
await fetch(`${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });

const adminUid = await createUser(TEST_ADMIN);
await createUser(TEST_NON_ADMIN);

// "Bearer owner" is the emulator's way to skip the security rules, like the Firebase console does
const res = await fetch(`${FIRESTORE}/admins?documentId=${adminUid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { name: { stringValue: 'School office (test)' } } }),
});
if (!res.ok) throw new Error(`Could not add admins/${adminUid}: ${await res.text()}`);

console.log(`Emulator ready. Admin user ID: ${adminUid}`);
