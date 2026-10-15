import { NextResponse } from 'next/server';

// Translates an announcement from English into Welsh for the admin form.
// Only signed-in school admins may use it, so nobody else can spend the Gemini key.
export const dynamic = 'force-dynamic';

// Tried in order: when the first is busy or down, the next one answers
const MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
const MAX_TITLE = 200;
const MAX_BODY = 10_000;

const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const projectId = useEmulators ? 'demo-morfaconnect' : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Firestore checks the sign-in token itself: reading admins/{uid} only succeeds when the token
// is genuine, belongs to that user, and the admins entry exists (see firestore.rules).
// Returns the admin's user ID, or null.
async function adminUid(idToken: string): Promise<string | null> {
    let uid: unknown;
    try {
        uid = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')).user_id;
    } catch {
        return null;
    }
    if (!projectId || typeof uid !== 'string' || !/^[A-Za-z0-9]{1,128}$/.test(uid)) return null;
    const host = useEmulators ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
    const res = await fetch(`${host}/v1/projects/${projectId}/databases/(default)/documents/admins/${uid}`, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: 'no-store',
    });
    return res.ok ? uid : null;
}

// A brake on the Gemini bill if an admin login is ever misused: each admin may translate
// 50 times an hour. The count lives in Firestore (translateUsage/{uid}_{hour}) and is added to
// with the admin's own sign-in, so firestore.rules enforce the cap across every server.
async function takeTranslationSlot(uid: string, idToken: string): Promise<boolean> {
    const hour = new Date().toISOString().slice(0, 13).replace(/[-T]/g, ''); // e.g. 2026101509
    const name = `projects/${projectId}/databases/(default)/documents/translateUsage/${uid}_${hour}`;
    const host = useEmulators ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
    const res = await fetch(`${host}/v1/projects/${projectId}/databases/(default)/documents:commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
            // "Add 1, creating the counter if this is the hour's first translation"
            writes: [{
                update: { name, fields: {} },
                updateMask: { fieldPaths: [] },
                updateTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
            }],
        }),
        cache: 'no-store',
    });
    return res.ok;
}

const FAILED = 'Translation failed. Please try again, or type the Welsh yourself.';

export async function POST(request: Request) {
    const idToken = request.headers.get('authorization')?.replace(/^Bearer /, '');
    const uid = idToken ? await adminUid(idToken) : null;
    if (!uid || !idToken) {
        return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
    }
    if (!(await takeTranslationSlot(uid, idToken))) {
        return NextResponse.json({ error: 'That is a lot of translations in a short time. Please wait a few minutes and try again.' }, { status: 429 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Translation is not set up on this site.' }, { status: 503 });
    }

    const { title = '', body = '' } = await request.json().catch(() => ({}));
    if (typeof title !== 'string' || typeof body !== 'string' || !title.trim() || title.length > MAX_TITLE || body.length > MAX_BODY) {
        return NextResponse.json({ error: 'Add an English title first (and keep the text under 10,000 characters).' }, { status: 400 });
    }

    const payload = JSON.stringify({
        systemInstruction: {
            parts: [{
                text: 'You translate announcements for Ysgol Maes Y Morfa, a primary school in Wales, from English into natural, '
                    + 'friendly Welsh as a Welsh primary school would write to parents. Keep names, dates, times, numbers and '
                    + 'line breaks. Translate the title and the body. If the body is empty, return an empty body.',
            }],
        },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify({ title, body }) }] }],
        generationConfig: {
            temperature: 0.2,
            // Enough for a full 10,000-character announcement in Welsh, and no more
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
            responseSchema: {
                type: 'OBJECT',
                properties: { title: { type: 'STRING' }, body: { type: 'STRING' } },
                required: ['title', 'body'],
            },
        },
    });

    let res: Response | null = null;
    for (const model of MODELS) {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: payload,
        });
        if (res.ok) break;
        console.error(`Gemini translation failed on ${model}:`, res.status, await res.text().catch(() => ''));
        // Only a busy or broken model is worth trying again; a bad request fails the same way on every model
        if (![429, 500, 503].includes(res.status)) break;
    }

    if (!res?.ok) {
        return NextResponse.json({ error: FAILED }, { status: 502 });
    }

    try {
        const data = await res.json();
        const translated = JSON.parse(data.candidates[0].content.parts[0].text);
        return NextResponse.json({ title: String(translated.title ?? ''), body: String(translated.body ?? '') });
    } catch (error) {
        console.error('Gemini translation gave an unexpected reply:', error);
        return NextResponse.json({ error: FAILED }, { status: 502 });
    }
}
