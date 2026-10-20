import { createHash, createSign } from 'node:crypto';

// Server side of school alerts, shared by /api/alerts (send an urgent post) and /api/alerts/devices
// (sign a phone up or off). Everything goes through Google's REST APIs with the school's service
// account, so the phone list stays closed to everyone else (firestore.rules) and no Admin SDK is needed.

export const emulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const projectId = emulators ? 'demo-morfaconnect' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const API = emulators ? 'http://127.0.0.1:8080/v1' : 'https://firestore.googleapis.com/v1';
// Document names as Firestore writes them, and their web address
export const DOCUMENTS = `projects/${projectId}/databases/(default)/documents`;
export const FIRESTORE = `${API}/${DOCUMENTS}`;
// Emulator tests may point this at a pretend push service; without one, nothing is sent or checked
const PUSH = emulators ? process.env.ALERTS_TEST_PUSH_URL : `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
export const canPush = !!PUSH && !!projectId;
const SCOPES = 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore';

// A push token as Firebase writes them (letters, digits, - _ :)
export const isPushToken = (value: unknown): value is string =>
    typeof value === 'string' && /^[A-Za-z0-9_:-]{20,500}$/.test(value);

// Each phone's document is named with a fingerprint of its token: tokens contain ":", which
// Google's REST addresses read as a command
export const deviceId = (token: string) => createHash('sha256').update(token).digest('hex');

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

// The school's Firebase service account: Vercel env var FIREBASE_SERVICE_ACCOUNT, holding the whole
// JSON key file (Firebase console > Project settings > Service accounts > Generate new private key)
function serviceAccount(): ServiceAccount | null {
    try {
        const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '');
        return typeof account?.client_email === 'string' && typeof account?.private_key === 'string' ? account : null;
    } catch {
        return null;
    }
}

// A Google access token for the service account (signed here, so no extra package is needed)
let cachedToken: { value: string; expires: number } | null = null;
async function googleToken(account: ServiceAccount): Promise<string> {
    if (cachedToken && cachedToken.expires > Date.now() + 60_000) return cachedToken.value;
    const tokenUrl = account.token_uri || 'https://oauth2.googleapis.com/token';
    const now = Math.floor(Date.now() / 1000);
    const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const unsigned = `${part({ alg: 'RS256', typ: 'JWT' })}.${part({ iss: account.client_email, scope: SCOPES, aud: tokenUrl, iat: now, exp: now + 3600 })}`;
    const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || typeof data.access_token !== 'string') throw new Error(`Google sign-in for alerts failed (${res.status})`);
    cachedToken = { value: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
    return cachedToken.value;
}

// The server's own pass for the phone list and the push service. Null when alerts are not set up
// (no service account on the live site). The emulator's "owner" pass skips the rules.
export async function serverPass(): Promise<string | null> {
    if (emulators) return 'owner';
    const account = serviceAccount();
    return account ? googleToken(account) : null;
}

export const firestore = (path: string, pass: string, init: RequestInit = {}) =>
    fetch(`${FIRESTORE}${path.startsWith(':') ? '' : '/'}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${pass}`, 'Content-Type': 'application/json' },
        cache: 'no-store',
    });

// Writes that only happen if their conditions still hold (currentDocument), all or none
export const commit = (pass: string, writes: object[]) =>
    firestore(':commit', pass, { method: 'POST', body: JSON.stringify({ writes }) });

// 'gone': Firebase says this phone will never take an alert again (turned off, app deleted).
// 'retry': Firebase said it did not take the alert and is busy for a moment. 'failed': anything else,
// including no answer at all (the alert may have gone, so it is never sent again on its own).
export type PushResult = 'sent' | 'gone' | 'retry' | 'failed';

// Sends data-only web push to one phone (public/sw.js shows it). With check, Firebase only checks
// the token and sends nothing.
// retryWait: how many seconds the caller waits before a second try; a longer Retry-After means no retry
export async function push(pass: string, token: string, data: Record<string, string>, check = false, retryWait = 0): Promise<PushResult> {
    if (!PUSH) return check ? 'sent' : 'failed';
    try {
        const res = await fetch(PUSH, {
            method: 'POST',
            headers: { Authorization: `Bearer ${pass}`, 'Content-Type': 'application/json' },
            // High urgency wakes a sleeping phone; after 12 hours an alert that has not arrived is old news
            body: JSON.stringify({
                validate_only: check,
                message: { token, webpush: { headers: { Urgency: 'high', TTL: '43200' }, data } },
            }),
        });
        if (res.ok) return 'sent';
        const error = (await res.json().catch(() => null))?.error;
        const code = (error?.details ?? []).find((d: { '@type'?: string }) => d['@type'] === 'type.googleapis.com/google.firebase.fcm.v1.FcmError')?.errorCode;
        if (code === 'UNREGISTERED') return 'gone';
        // A check sends the same fixed words every time, so a bad request there can only be the token
        if (check && res.status === 400 && code === 'INVALID_ARGUMENT') return 'gone';
        // Too many sends (429) means wait a minute or more, too long for one request; so does a long Retry-After
        // (a Retry-After given as a date is treated as long)
        const after = res.headers.get('retry-after');
        const wait = after === null ? 0 : Number(after);
        if (res.status >= 500 && Number.isFinite(wait) && wait <= retryWait) return 'retry';
        return 'failed';
    } catch {
        return 'failed';
    }
}
