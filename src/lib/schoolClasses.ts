// The school's classes ("dosbarthiadau") and who leads them. One place to edit when classes change.
// Also used by: the Morfa Runner league API, firestore.rules (class list), and
// public/morfa-runner/morfa-runner-game.js (keep its CLASSES list in step with this one).

export type Bilingual = { en: string; cy: string };

export type SchoolClass = {
    id: string;
    name: string; // shown as "Dosbarth <name>"
    year: Bilingual | null; // null where the school has not said which year group
    teachers: { name: string; role: Bilingual }[];
};

// Roles as written on the school's own website; no Welsh given, so the same text in both languages
const same = (text: string): Bilingual => ({ en: text, cy: text });

export const SCHOOL_CLASSES: SchoolClass[] = [
    {
        id: 'bethania',
        name: 'Bethania',
        year: { en: 'Year 6', cy: 'Blwyddyn 6' },
        teachers: [{ name: 'Mr R Gravell', role: { en: 'Deputy Headteacher', cy: 'Dirprwy Bennaeth' } }],
    },
    {
        id: 'tregoning',
        name: 'Tregoning',
        year: { en: 'Year 5', cy: 'Blwyddyn 5' },
        teachers: [{ name: 'Mr G Lewis', role: same('Mathematics, Science and Technology Leader') }],
    },
    {
        id: 'florence',
        name: 'Florence',
        year: { en: 'Year 4', cy: 'Blwyddyn 4' },
        teachers: [{ name: 'Mrs T Harris', role: same('Language, Literacy and Communication Leader') }],
    },
    {
        id: 'westbury',
        name: 'Westbury',
        year: { en: 'Year 3', cy: 'Blwyddyn 3' },
        teachers: [{ name: 'Mrs H Mason', role: same('Welsh and MFL Co-ordinator, NQT and Student Mentor') }],
    },
    {
        id: 'trinity',
        name: 'Trinity',
        year: null,
        teachers: [{ name: 'Mrs A Murphy', role: same('Expressive Arts Co-ordinator') }],
    },
    {
        id: 'olive',
        name: 'Olive',
        year: null,
        teachers: [
            { name: 'Miss J Barclay', role: same('ALNCO, Foundation Phase Co-ordinator') },
            { name: 'Mrs K Smith', role: same('Early Years Practitioner') },
        ],
    },
];

export const CLASS_IDS = SCHOOL_CLASSES.map((c) => c.id);
