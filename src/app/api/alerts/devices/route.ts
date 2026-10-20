import { NextResponse } from 'next/server';
import { deviceId, firestore, isPushToken, push, serverPass } from '@/lib/pushServer';

// Signs a phone up for school alerts, or off again (src/lib/schoolAlerts.ts). Phones cannot write to
// the list themselves: this checks each token with Firebase first, so nobody can fill the list with
// made-up phones and slow down or block a real alert.
export const dynamic = 'force-dynamic';

// Far more than the school's families, and few enough that one alert reaches them all within the
// send route's time limit, even if someone signs up made-up phones from real browsers
const MAX_PHONES = 3000;

async function phoneCount(pass: string): Promise<number> {
    const res = await firestore(':runAggregationQuery', pass, {
        method: 'POST',
        body: JSON.stringify({ structuredAggregationQuery: { structuredQuery: { from: [{ collectionId: 'alertDevices' }] }, aggregations: [{ alias: 'n', count: {} }] } }),
    });
    if (!res.ok) throw new Error(`Could not count the phones (${res.status})`);
    const [first] = (await res.json()) as { result?: { aggregateFields?: { n?: { integerValue?: string } } } }[];
    return Number(first?.result?.aggregateFields?.n?.integerValue ?? 0);
}

const isListed = async (pass: string, token: string) => {
    const res = await firestore(`alertDevices/${deviceId(token)}`, pass);
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`Could not read the phone list (${res.status})`);
    return true;
};

const answer = (error: string, status: number) => NextResponse.json({ error }, { status });

// { token, lang, previous? }: previous is this phone's old token, replaced when Firebase gives it a new one
export async function POST(req: Request) {
    const { token, lang, previous } = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (!isPushToken(token) || (lang !== 'en' && lang !== 'cy') || (previous !== undefined && !isPushToken(previous))) {
        return answer('bad-request', 400);
    }
    try {
        const pass = await serverPass();
        if (!pass) return answer('not-set-up', 503);
        // A phone renewing its sign-up, or swapping in a new token, does not add to the list
        const adds = !(await isListed(pass, token)) && !(typeof previous === 'string' && previous !== token && (await isListed(pass, previous)));
        if (adds && (await phoneCount(pass)) >= MAX_PHONES) return answer('full', 503);
        const check = await push(pass, token, { check: '1' }, true);
        if (check === 'gone') return answer('bad-token', 400);
        if (check !== 'sent') return answer('failed', 502);

        const saved = await firestore(`alertDevices/${deviceId(token)}`, pass, {
            method: 'PATCH',
            body: JSON.stringify({ fields: { token: { stringValue: token }, lang: { stringValue: lang }, updatedAt: { timestampValue: new Date().toISOString() } } }),
        });
        if (!saved.ok) return answer('failed', 502);
        if (previous && previous !== token) await firestore(`alertDevices/${deviceId(previous)}`, pass, { method: 'DELETE' }).catch(() => {});
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Alert sign-up failed:', error);
        return answer('failed', 502);
    }
}

// { token }: knowing the token is the proof, and only that phone knows it
export async function DELETE(req: Request) {
    const { token } = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
    if (!isPushToken(token)) return answer('bad-request', 400);
    try {
        const pass = await serverPass();
        if (!pass) return answer('not-set-up', 503);
        const removed = await firestore(`alertDevices/${deviceId(token)}`, pass, { method: 'DELETE' });
        return removed.ok ? NextResponse.json({ ok: true }) : answer('failed', 502);
    } catch (error) {
        console.error('Alert sign-off failed:', error);
        return answer('failed', 502);
    }
}
