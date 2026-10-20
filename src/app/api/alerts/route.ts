import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { htmlToText } from '@/lib/utils';
import { canPush, commit, DOCUMENTS, firestore, FIRESTORE, push, serverPass, type PushResult } from '@/lib/pushServer';

// Sends a school alert to every phone that turned alerts on (src/lib/schoolAlerts.ts). The admin form
// calls this right after staff save a post with the red banner and "Send an alert to phones" on. The
// words come from the saved post, never from the request, so only a real urgent post can go out.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BATCH = 50;
// The same words for the same post go to each phone once in this time: a double tap, or a retry after
// a lost answer, does not alert every phone twice. Changed words (a correction) go to everyone again.
const REPEAT_MS = 10 * 60 * 1000;
// Longer than this route can run: a send still marked as going after this has died part way
const STALE_MS = 2 * 60 * 1000;
// How long the route waits before trying a busy push service once more
const RETRY_WAIT_S = 2;

type Phone = { name: string; token: string; lang: 'en' | 'cy'; updatedAt: number };
type Alert = { title: string; body: string; url: string; tag: string };
type Value = { stringValue?: string; booleanValue?: boolean; timestampValue?: string; arrayValue?: { values?: { stringValue?: string }[] } };
type Fields = Record<string, Value>;
type FirestoreDoc = { name: string; updateTime?: string; fields?: Fields };

// The user ID inside a Firebase sign-in token. Not trusted on its own: Firestore checks the token.
function uidFrom(idToken: string): string | null {
    try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
        const uid = payload.user_id ?? payload.sub;
        return typeof uid === 'string' && /^[A-Za-z0-9]{1,128}$/.test(uid) ? uid : null;
    } catch {
        return null;
    }
}

const plain = (html: string) => htmlToText(html).replace(/\s+/g, ' ').trim();
const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

const isSendable = (post: Fields) =>
    post.isUrgent?.booleanValue === true && post.published?.booleanValue === true && /^[a-zA-Z0-9_-]{1,120}$/.test(post.slug?.stringValue ?? '');

// The alert in both languages. Welsh phones get the Welsh words (the form puts the English in when
// the Welsh boxes are empty).
function alertsFor(post: Fields, newsId: string) {
    const alertIn = (lang: 'en' | 'cy'): Alert => {
        const title = post[`title_${lang}`]?.stringValue || post.title_en?.stringValue || 'Ysgol Maes Y Morfa';
        const body = plain(post[`body_${lang}`]?.stringValue || post.body_en?.stringValue || '');
        return {
            title: shorten(title, 100),
            body: shorten(body, 140) || (lang === 'cy' ? 'Tapiwch i ddarllen mwy.' : 'Tap to read more.'),
            url: `/news/${post.slug?.stringValue}`,
            // A second alert for the same post replaces the first on the phone instead of stacking up
            tag: `news-${newsId}`,
        };
    };
    const alerts = { en: alertIn('en'), cy: alertIn('cy') };
    return { alerts, words: createHash('sha256').update(JSON.stringify(alerts)).digest('hex') };
}

// Every phone on the list (at most 3,000: /api/alerts/devices stops sign-ups there)
async function allPhones(pass: string): Promise<Phone[]> {
    const phones: Phone[] = [];
    let pageToken = '';
    do {
        const res = await firestore(`alertDevices?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`, pass);
        if (!res.ok) throw new Error(`Could not read the phone list (${res.status})`);
        const data = (await res.json()) as { documents?: FirestoreDoc[]; nextPageToken?: string };
        for (const d of data.documents ?? []) {
            const token = d.fields?.token?.stringValue;
            if (token) phones.push({
                name: d.name.split('/').pop()!,
                token,
                lang: d.fields?.lang?.stringValue === 'cy' ? 'cy' : 'en',
                updatedAt: Date.parse(d.fields?.updatedAt?.timestampValue ?? '') || 0,
            });
        }
        pageToken = data.nextPageToken ?? '';
    } while (pageToken);
    return phones;
}

// alertLog/{newsId} records the post's latest send: its words, when it started, whether it is still
// going, and the phones it could not reach. Every change to it is made only if it is still the version
// this request last saw, so two requests at once can never both send, or undo each other's record.
// only: null sends to everyone; otherwise to the phones the last send of these words missed, plus any
// phone that signed up again since it started (it may have swapped in a new token).
type Claim = { version: string; startedAt: string; only: { missed: Set<string>; since: number } | null; before: Fields | null };

const logName = (newsId: string) => `${DOCUMENTS}/alertLog/${newsId}`;

const logFields = (words: string, startedAt: string, state: 'sending' | 'done', pending: string[]) => ({
    words: { stringValue: words },
    startedAt: { timestampValue: startedAt },
    state: { stringValue: state },
    pending: { arrayValue: pending.length ? { values: pending.map((id) => ({ stringValue: id })) } : {} },
});

async function writeLog(pass: string, newsId: string, fields: object, currentDocument: object): Promise<string | null> {
    const res = await commit(pass, [{ update: { name: logName(newsId), fields }, currentDocument }]);
    if (!res.ok) return null;
    return ((await res.json()) as { writeResults?: { updateTime?: string }[] }).writeResults?.[0]?.updateTime ?? null;
}

// startedAt is taken before the phone list is read, so a phone that signs up again after the read
// counts as new for the next retry
async function claimSend(pass: string, newsId: string, words: string, startedAt: string): Promise<Claim | 'already-sent' | 'in-progress'> {
    const fresh = await writeLog(pass, newsId, logFields(words, startedAt, 'sending', []), { exists: false });
    if (fresh) return { version: fresh, startedAt, only: null, before: null };

    const res = await firestore(`alertLog/${newsId}`, pass);
    if (!res.ok) throw new Error(`Could not read the alert log (${res.status})`);
    const log = (await res.json()) as FirestoreDoc;
    const lastStart = Date.parse(log.fields?.startedAt?.timestampValue ?? '');
    const age = Date.now() - lastStart;
    const state = log.fields?.state?.stringValue;
    if (state === 'sending' && age < STALE_MS) return 'in-progress';
    // A send that died part way may have reached anyone, so its words go to everyone again
    const missed = (log.fields?.pending?.arrayValue?.values ?? []).map((v) => v.stringValue ?? '').filter(Boolean);
    const retry = state === 'done' && log.fields?.words?.stringValue === words && age < REPEAT_MS;
    if (retry && missed.length === 0) return 'already-sent';

    const version = await writeLog(pass, newsId, logFields(words, startedAt, 'sending', []), { updateTime: log.updateTime });
    if (!version) return 'in-progress';
    return { version, startedAt, only: retry ? { missed: new Set(missed), since: lastStart } : null, before: log.fields ?? null };
}

// Puts the record back as it was before this request took it (only if it is still this request's own)
const giveBack = (pass: string, newsId: string, claim: Claim) =>
    commit(pass, [{
        ...(claim.before ? { update: { name: logName(newsId), fields: claim.before } } : { delete: logName(newsId) }),
        currentDocument: { updateTime: claim.version },
    }]).catch(() => {});

export async function POST(req: Request) {
    const idToken = req.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
    const uid = idToken ? uidFrom(idToken) : null;
    if (!idToken || !uid) return NextResponse.json({ error: 'not-signed-in' }, { status: 401 });

    const { newsId } = ((await req.json().catch(() => null)) ?? {}) as { newsId?: unknown };
    if (typeof newsId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(newsId)) {
        return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }

    // Only school admins. Firestore checks the sign-in token, and its rules let a person read only
    // their own admins/{uid} entry, which exists only for admins (the same check as the admin area).
    const asCaller = (path: string) => fetch(`${FIRESTORE}/${path}`, { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store' });
    if (!(await asCaller(`admins/${uid}`)).ok) return NextResponse.json({ error: 'not-admin' }, { status: 403 });

    const readPost = async (): Promise<Fields | null> => {
        const res = await asCaller(`news/${newsId}`);
        return res.ok ? (((await res.json()) as FirestoreDoc).fields ?? {}) : null;
    };
    const post = await readPost();
    if (!post) return NextResponse.json({ error: 'no-post' }, { status: 404 });
    if (!isSendable(post)) return NextResponse.json({ error: 'not-urgent' }, { status: 409 });
    const { alerts, words } = alertsFor(post, newsId);

    try {
        const pass = await serverPass();
        if (!pass) return NextResponse.json({ error: 'not-set-up' }, { status: 503 });
        const startedAt = new Date().toISOString();
        const everyone = await allPhones(pass);
        if (!canPush) return NextResponse.json({ devices: everyone.length, sent: 0, failed: 0, removed: 0, dryRun: true, alert: alerts.en });
        if (everyone.length === 0) return NextResponse.json({ devices: 0, sent: 0, failed: 0, removed: 0 });

        const claim = await claimSend(pass, newsId, words, startedAt);
        if (typeof claim === 'string') return NextResponse.json({ error: claim }, { status: 409 });
        // Someone may have saved (and sent) a correction since the post was read. Now that this request
        // holds the record, any later send has to wait for it, so one last look settles which words go.
        const now = await readPost();
        if (!now || !isSendable(now) || alertsFor(now, newsId).words !== words) {
            await giveBack(pass, newsId, claim);
            return NextResponse.json({ error: 'changed' }, { status: 409 });
        }
        const only = claim.only;
        const phones = only ? everyone.filter((phone) => only.missed.has(phone.name) || phone.updatedAt > only.since) : everyone;

        // Phones Firebase said it was too busy for get one more try, a moment later
        const results = new Map<Phone, PushResult>();
        let waiting = phones;
        for (let attempt = 0; attempt < 2 && waiting.length > 0; attempt++) {
            if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT_S * 1000));
            for (let i = 0; i < waiting.length; i += BATCH) {
                const batch = waiting.slice(i, i + BATCH);
                const out = await Promise.all(batch.map((phone) => push(pass, phone.token, alerts[phone.lang], false, RETRY_WAIT_S)));
                batch.forEach((phone, n) => results.set(phone, out[n]));
            }
            waiting = waiting.filter((phone) => results.get(phone) === 'retry');
        }
        // Still busy after the second try: missed, for a later retry
        const sent = phones.filter((phone) => results.get(phone) === 'sent').length;
        const gone = phones.filter((phone) => results.get(phone) === 'gone');
        const missed = phones.filter((phone) => results.get(phone) !== 'sent' && results.get(phone) !== 'gone');
        let removed = 0;
        await Promise.all(gone.map((phone) => firestore(`alertDevices/${phone.name}`, pass, { method: 'DELETE' })
            .then((res) => { if (res.ok) removed += 1; })
            .catch(() => {})));
        // Saving the post again with the switch on tries the missed phones, and only them
        await writeLog(pass, newsId, logFields(words, claim.startedAt, 'done', missed.map((phone) => phone.name)), { updateTime: claim.version });

        const counts = { devices: phones.length, sent, failed: missed.length, removed };
        if (sent === 0 && missed.length > 0) return NextResponse.json({ error: 'failed', ...counts }, { status: 502 });
        return NextResponse.json(counts);
    } catch (error) {
        console.error('School alert failed:', error);
        return NextResponse.json({ error: 'failed' }, { status: 502 });
    }
}
