import { NextResponse } from 'next/server';

// Morfa Runner class league: one best score per class. No names are ever stored.
export const dynamic = 'force-dynamic';

const CLASS_IDS = ['nursery', 'reception', 'y1', 'y2', 'y3', 'y4', 'y5', 'y6'] as const;
type ClassId = (typeof CLASS_IDS)[number];
type ClassRow = { classId: ClassId; best: number; games: number };

// A long, very good run at full speed scores in the tens of thousands; anything above this is not a real run.
const MAX_SCORE = 200_000;
const COLLECTION = 'morfaRunnerClasses';

// Firestore when the project's Firebase settings exist, otherwise an in-memory league
// (fine for demos; it empties when the server restarts).
const useFirestore = !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const memory = new Map<ClassId, ClassRow>(CLASS_IDS.map((id) => [id, { classId: id, best: 0, games: 0 }]));

async function firestore() {
    const { db } = await import('@/lib/firebase/config');
    const fs = await import('firebase/firestore');
    return { db, fs };
}

async function readLeague(): Promise<ClassRow[]> {
    if (!useFirestore) return CLASS_IDS.map((id) => ({ ...memory.get(id)! }));
    const { db, fs } = await firestore();
    const snap = await fs.getDocs(fs.collection(db, COLLECTION));
    const found = new Map(snap.docs.map((d) => [d.id, d.data()]));
    return CLASS_IDS.map((id) => ({
        classId: id,
        best: Number(found.get(id)?.best ?? 0),
        games: Number(found.get(id)?.games ?? 0),
    }));
}

// Records one finished run. Returns true when it beat the class's previous best.
async function recordRun(classId: ClassId, score: number): Promise<boolean> {
    if (!useFirestore) {
        const row = memory.get(classId)!;
        const beat = score > row.best;
        memory.set(classId, { classId, best: Math.max(row.best, score), games: row.games + 1 });
        return beat;
    }
    const { db, fs } = await firestore();
    const ref = fs.doc(db, COLLECTION, classId);
    return fs.runTransaction(db, async (tx) => {
        const cur = await tx.get(ref);
        const best = Number(cur.data()?.best ?? 0);
        const games = Number(cur.data()?.games ?? 0);
        tx.set(ref, { best: Math.max(best, score), games: games + 1, updatedAt: fs.serverTimestamp() });
        return score > best;
    });
}

export async function GET() {
    try {
        return NextResponse.json({ classes: await readLeague() });
    } catch {
        return NextResponse.json({ error: 'League unavailable' }, { status: 503 });
    }
}

export async function POST(req: Request) {
    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    const { classId, score } = (body ?? {}) as { classId?: unknown; score?: unknown };

    if (typeof classId !== 'string' || !(CLASS_IDS as readonly string[]).includes(classId)) {
        return NextResponse.json({ error: 'Unknown class' }, { status: 400 });
    }
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
        return NextResponse.json({ error: 'Score out of range' }, { status: 400 });
    }

    try {
        const newClassRecord = await recordRun(classId as ClassId, score);
        return NextResponse.json({ classes: await readLeague(), newClassRecord });
    } catch {
        return NextResponse.json({ error: 'League unavailable' }, { status: 503 });
    }
}
