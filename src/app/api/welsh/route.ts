import { NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { commit, DOCUMENTS, firestore, serverPass } from '@/lib/pushServer';
import { translatePieceToWelsh } from '@/ai/flows/translate-to-welsh';
import { FEATURES } from '@/lib/config/features';

// Welsh for the English still showing on a page when a visitor has the site in Cymraeg
// (src/components/LiveWelsh.tsx). Each piece of English goes to Gemini once, on its own: the Welsh is
// kept in Firestore (welshCache, one document per piece, named by a fingerprint of the English) and
// every later visitor gets it from there. Visitors are not signed in and choose what they send, so:
// - each piece is translated in its own call, so nothing sent with it can change its Welsh
// - one address may only send so many requests a minute (add a Vercel Firewall rate limit on this
//   path too: this one only counts per server)
// - a daily cap, counted in Firestore, limits what goes to Gemini across the whole site
// - with no Firestore on a live server (a Vercel preview), nothing new is translated
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PIECES = 80;
const MAX_PIECE = 1500;
const MAX_TOTAL = 15000;
// Pieces sent to Gemini per day (UTC), across all visitors. The first Welsh visit to each page sends
// its English, so this is set for the whole site being seen in a day. Vercel env var to change it.
const DAILY_LIMIT = Number(process.env.WELSH_DAILY_LIMIT) || 20000;
// Gemini calls at once for one request
const AT_ONCE = 16;
// The answer goes back by then with what is ready; the rest is finished and kept after the answer.
// No new call starts after START_UNTIL_MS, and a call gets CALL_MS, so all is done inside maxDuration.
const ANSWER_WITHIN_MS = 25_000;
const START_UNTIL_MS = 35_000;
const CALL_MS = 20_000;
// Requests a minute from one address, on one server. A page sends one to three.
const PER_MINUTE = 60;

const hasKey = () => !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY);
const idOf = (text: string) => createHash('sha256').update(text).digest('hex');
const cacheDoc = (id: string) => `${DOCUMENTS}/welshCache/${id}`;
const today = () => new Date().toISOString().slice(0, 10);
const wait = (ms: number) => new Promise<null>((resolve) => setTimeout(() => resolve(null), Math.max(0, ms)));

// This server's own copy, so a busy page does not read Firestore every time. Also the only store on a
// local preview with no Firebase project.
const memory = new Map<string, string>();
const remember = (id: string, welsh: string) => {
    memory.set(id, welsh);
    if (memory.size > 5000) memory.delete(memory.keys().next().value!);
};
// Pieces being translated on this server now, so two visitors at once share one call
const working = new Map<string, Promise<string | null>>();
const requests = new Map<string, { minute: number; count: number }>();
let capReachedOn = '';
let localCount = { day: '', pieces: 0 };

function tooMany(address: string) {
    const minute = Math.floor(Date.now() / 60_000);
    const seen = requests.get(address);
    if (seen && seen.minute === minute) return ++seen.count > PER_MINUTE;
    if (requests.size > 10_000) requests.clear();
    requests.set(address, { minute, count: 1 });
    return false;
}

type BatchGetResult = { found?: { name: string; fields?: { cy?: { stringValue?: string } } }; missing?: string };

async function fromFirestore(pass: string, ids: string[]): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    const res = await firestore(':batchGet', pass, { method: 'POST', body: JSON.stringify({ documents: ids.map(cacheDoc) }) });
    if (!res.ok) throw new Error(`Could not read the Welsh store (${res.status})`);
    for (const item of (await res.json()) as BatchGetResult[]) {
        const welsh = item.found?.fields?.cy?.stringValue;
        if (item.found && typeof welsh === 'string') found.set(item.found.name.split('/').pop()!, welsh);
    }
    return found;
}

// Adds to today's count and says whether it is still under the cap. Once this server has seen the
// cap reached, it stops counting (and writing) until the next day.
async function withinDailyLimit(pass: string | null, pieces: number): Promise<boolean> {
    const day = today();
    if (capReachedOn === day) return false;
    let total: number;
    if (!pass) {
        if (localCount.day !== day) localCount = { day, pieces: 0 };
        total = localCount.pieces += pieces;
    } else {
        const res = await commit(pass, [{
            transform: {
                document: `${DOCUMENTS}/welshUsage/${day}`,
                fieldTransforms: [{ fieldPath: 'pieces', increment: { integerValue: String(pieces) } }],
            },
        }]);
        if (!res.ok) throw new Error(`Could not count today's translations (${res.status})`);
        total = Number((await res.json()).writeResults?.[0]?.transformResults?.[0]?.integerValue);
    }
    if (!(total <= DAILY_LIMIT)) {
        capReachedOn = day;
        return false;
    }
    return true;
}

// One new Gemini call, shared with any other request that wants the same piece meanwhile. The request
// that starts it has already counted it, and keeps the Welsh (saves holds the Firestore writes).
function translate(id: string, en: string, pass: string | null, saves: Promise<unknown>[]): Promise<string | null> {
    const job = Promise.race([translatePieceToWelsh({ text: en }).then(({ text }) => text || null), wait(CALL_MS)])
        .catch((error) => {
            console.error('Live Welsh failed:', error instanceof Error ? error.message : error);
            return null;
        })
        .then((cy) => {
            if (cy) {
                remember(id, cy);
                if (pass) {
                    saves.push(commit(pass, [{
                        update: { name: cacheDoc(id), fields: { en: { stringValue: en }, cy: { stringValue: cy }, createdAt: { timestampValue: new Date().toISOString() } } },
                    }]).then((saved) => { if (!saved.ok) console.error(`Could not keep the Welsh (${saved.status})`); }, () => console.error('Could not keep the Welsh')));
                }
            }
            return cy;
        })
        .finally(() => working.delete(id));
    working.set(id, job);
    return job;
}

// Runs the work a few at a time
async function inTurn<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) await work(items[next++]);
    }));
}

export async function POST(req: Request) {
    const startedAt = Date.now();
    // English-only site (FEATURES.enableWelsh): the page never asks, and nothing is translated if anyone does
    if (!FEATURES.enableWelsh) return NextResponse.json({ error: 'welsh-off' }, { status: 404 });

    // Only this site's own pages. A script can say the same, so this only stops other websites;
    // the limits below are what stop scripts.
    const origin = req.headers.get('origin');
    const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
    let sameSite = false;
    try { sameSite = !!origin && !!host && new URL(origin).host === host; } catch {}
    if (!sameSite) return NextResponse.json({ error: 'not-allowed' }, { status: 403 });

    // Vercel puts the visitor's own address first
    const address = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (tooMany(address)) return NextResponse.json({ error: 'too-many' }, { status: 429 });

    const { texts } = ((await req.json().catch(() => null)) ?? {}) as { texts?: unknown };
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > MAX_PIECES
        || !texts.every((t) => typeof t === 'string' && t.trim().length > 0 && t.length <= MAX_PIECE)
        || (texts as string[]).reduce((sum, t) => sum + t.length, 0) > MAX_TOTAL) {
        return NextResponse.json({ error: 'bad-request' }, { status: 400 });
    }
    const pieces = texts as string[];
    const ids = pieces.map(idOf);
    const welsh = new Map<string, string>();
    for (const id of ids) if (memory.has(id)) welsh.set(id, memory.get(id)!);
    // Some pieces were still being translated when the answer went: the page asks again soon
    let pending = false;

    try {
        const pass = await serverPass();
        const unread = [...new Set(ids.filter((id) => !welsh.has(id)))];
        if (pass && unread.length) {
            for (const [id, cy] of await fromFirestore(pass, unread)) { welsh.set(id, cy); remember(id, cy); }
        }

        // What nobody has asked for before (one of each). Pieces another request is translating now
        // are waited for, never started again, so only the rest are counted against the cap.
        const fresh = new Map<string, string>();
        pieces.forEach((en, i) => { if (!welsh.has(ids[i])) fresh.set(ids[i], en); });
        const shared = new Map([...fresh.keys()].filter((id) => working.has(id)).map((id) => [id, working.get(id)!]));
        const starting = fresh.size - shared.size;
        const canTranslate = hasKey() && (!!pass || process.env.NODE_ENV !== 'production');

        if (fresh.size && canTranslate && (starting === 0 || await withinDailyLimit(pass, starting))) {
            const saves: Promise<unknown>[] = [];
            const all = inTurn([...fresh], AT_ONCE, async ([id, en]) => {
                let cy: string | null | undefined = memory.get(id);
                if (cy === undefined) {
                    const other = shared.get(id) ?? working.get(id);
                    if (other) cy = await other;
                    else if (Date.now() - startedAt < START_UNTIL_MS) cy = await translate(id, en, pass, saves);
                }
                if (cy) welsh.set(id, cy);
            });
            // Whatever is not ready in time still gets finished and kept, after the answer has gone
            after(async () => {
                await all;
                await Promise.all(saves);
            });
            let finished = false;
            await Promise.race([all.then(() => { finished = true; }), wait(ANSWER_WITHIN_MS - (Date.now() - startedAt))]);
            pending = !finished;
        }
    } catch (error) {
        // Whatever was found so far still goes back; the rest stays English until the next try
        console.error('Live Welsh failed:', error instanceof Error ? error.message : error);
    }

    return NextResponse.json({ texts: ids.map((id) => welsh.get(id) ?? null), pending });
}
