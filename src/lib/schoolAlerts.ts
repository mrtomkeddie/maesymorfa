'use client';

import { app, isFirebaseConfigured, useEmulators } from '@/lib/firebase/config';

// School alerts: a notification on parents' phones when staff publish an urgent post (a snow closure).
// Free web push through Firebase Cloud Messaging, no app store. Each phone that turns alerts on gets a
// push token from Firebase and signs up through /api/alerts/devices, which checks the token and keeps
// the list closed to everyone (firestore.rules). /api/alerts sends to the list.
// iPhones (iOS 16.4 and later) only allow this for sites added to the Home Screen.

// The site's public push key: Firebase console > Project settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const DEVICES_API = '/api/alerts/devices';
// This phone's token, so the button can say "on" and the phone can be signed off again
const STORE = 'morfa-alerts';
// How often a phone renews its sign-up, so phones still in use stay easy to tell from old ones
const RENEW_MS = 7 * 24 * 60 * 60 * 1000;

export type AlertState = 'hidden' | 'install' | 'off' | 'on' | 'blocked';
type Lang = 'en' | 'cy';
type Saved = { token: string; lang: Lang; savedAt: number };

// Live builds only (the service worker that shows alerts is not used by the dev server), and only once
// the site has its push key. Emulator test builds show it too, with a pretend token (see phoneToken).
const available = process.env.NODE_ENV === 'production' && isFirebaseConfigured && (!!VAPID_KEY || useEmulators);

export const isIPhone = () =>
    /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isInstalled = () =>
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

// iPhones before iOS 16.4 cannot get web alerts at all, even from the Home Screen
const iosTooOld = () => {
    const version = /(?:iPhone|iPad|iPod).*? OS (\d+)_(\d+)/.exec(navigator.userAgent);
    return !!version && (Number(version[1]) < 16 || (Number(version[1]) === 16 && Number(version[2]) < 4));
};

const readSaved = (): Saved | null => {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
        return typeof saved?.token === 'string' ? saved : null;
    } catch {
        return null;
    }
};

const writeSaved = (saved: Saved | null) => {
    try {
        if (saved) localStorage.setItem(STORE, JSON.stringify(saved));
        else localStorage.removeItem(STORE);
    } catch {
        // Private browsing: alerts still work, the button just cannot remember them
    }
};

// One change at a time, in every open tab of the site, so a renewal still running can never bring back
// alerts the parent just turned off. Browsers without the lock (before Safari 15.4) queue in this tab.
let queue: Promise<unknown> = Promise.resolve();
function inTurn<T>(task: () => Promise<T>): Promise<T> {
    if (navigator.locks) return navigator.locks.request('morfa-alerts', task);
    const next = queue.then(task, task);
    queue = next.catch(() => {});
    return next;
}

// What the button should offer on this phone right now
export function alertState(): AlertState {
    if (!available) return 'hidden';
    if (isIPhone() && !isInstalled()) return iosTooOld() ? 'hidden' : 'install';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'hidden';
    if (Notification.permission === 'denied') return 'blocked';
    return Notification.permission === 'granted' && readSaved() ? 'on' : 'off';
}

async function phoneToken(saved: Saved | null): Promise<string> {
    // The site's own service worker (public/sw.js) shows the alerts, so Firebase does not add a second one
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    const registration = await navigator.serviceWorker.ready;
    // Emulator test builds have no real push service to ask
    if (useEmulators) return saved?.token ?? `emulator-${crypto.randomUUID()}`;
    const { getMessaging, getToken } = await import('firebase/messaging');
    return getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
}

const devices = (method: 'POST' | 'DELETE', body: object) =>
    fetch(DEVICES_API, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function signUp(token: string, lang: Lang, previous: string | undefined) {
    const res = await devices('POST', { token, lang, ...(previous && previous !== token ? { previous } : {}) });
    if (!res.ok) throw new Error(`Could not sign this phone up (${res.status})`);
    writeSaved({ token, lang, savedAt: Date.now() });
}

// Call only from a tap: phones ignore, or remember a "no" for, a site that asks out of the blue.
// The ask comes first, before anything is awaited, or iPhones refuse it.
export async function turnOnAlerts(lang: Lang): Promise<AlertState> {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
    return inTurn(async () => {
        const saved = readSaved();
        await signUp(await phoneToken(saved), lang, saved?.token);
        return 'on' as const;
    });
}

export function turnOffAlerts(): Promise<void> {
    return inTurn(async () => {
        const saved = readSaved();
        if (saved) {
            const res = await devices('DELETE', { token: saved.token });
            if (!res.ok) throw new Error(`Could not sign this phone off (${res.status})`);
        }
        writeSaved(null);
        if (!useEmulators) {
            const { getMessaging, deleteToken } = await import('firebase/messaging');
            await deleteToken(getMessaging(app)).catch(() => {});
        }
    });
}

// On each visit: Firebase gives the phone a new token now and then, so keep the sign-up in step.
// Alerts stay in the language the parent was reading when they turned them on.
export function renewAlerts(): Promise<void> {
    return inTurn(async () => {
        const saved = readSaved();
        if (!saved || alertState() !== 'on') return;
        const token = await phoneToken(saved);
        if (token === saved.token && Date.now() - saved.savedAt < RENEW_MS) return;
        await signUp(token, saved.lang, saved.token);
    });
}
