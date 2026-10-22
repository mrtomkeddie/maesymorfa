import { NextResponse } from 'next/server';
import { emulators, FIRESTORE, uidFrom } from '@/lib/pushServer';
import { translateToWelsh } from '@/ai/flows/translate-to-welsh';
import { FEATURES } from '@/lib/config/features';

// Fills the Welsh boxes of the admin news form from the English (src/ai/flows/translate-to-welsh.ts).
// Each call costs money on the school's Gemini key, so only school admins can use it.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Vercel env var GEMINI_API_KEY (aistudio.google.com > Get API key). The Genkit plugin also reads these two.
const hasKey = () => !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);

// The admin area's no-sign-in demo (isLocalDemo in src/lib/firebase/config.ts): a local preview with
// no Firebase project, so there is nobody to check
const isLocalDemo = process.env.NODE_ENV === 'development' && !emulators
    && !(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);

const MAX_TITLE = 200;
const MAX_BODY = 10000;

export async function POST(req: Request) {
    if (!isLocalDemo) {
        const idToken = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
        const uid = idToken ? uidFrom(idToken) : null;
        if (!idToken || !uid) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });
        // The same check as /api/alerts: Firestore checks the sign-in token, and its rules let a person
        // read only their own admins/{uid} entry, which exists only for admins
        const res = await fetch(`${FIRESTORE}/admins/${uid}`, { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store' });
        if (!res.ok) return NextResponse.json({ error: 'not-admin' }, { status: 403 });
    }

    const { title, body } = ((await req.json().catch(() => null)) ?? {}) as { title?: unknown; body?: unknown };
    if (typeof title !== 'string' || !title.trim() || title.length > MAX_TITLE
        || (body !== undefined && (typeof body !== 'string' || body.length > MAX_BODY))) {
        return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }

    if (!hasKey() || !FEATURES.enableWelsh) return NextResponse.json({ error: 'not-set-up' }, { status: 503 });

    try {
        const welsh = await translateToWelsh({ title: title.trim(), body: typeof body === 'string' ? body.trim() : '' });
        return NextResponse.json(welsh);
    } catch (error) {
        console.error('Translation failed:', error);
        return NextResponse.json({ error: 'error' }, { status: 502 });
    }
}
