// Carmarthenshire term dates, from the Welsh Government's approved list:
// https://www.gov.wales/approved-school-term-dates-2026-2027-html
// Update once a year when the next year's list is published (usually two years ahead).
import type { Bilingual } from './schoolClasses';

export type Term = {
    name: Bilingual;
    starts: string; // ISO date
    halfTerm: [string, string];
    ends: string;
};

export const SCHOOL_YEAR: Bilingual = { en: '2026 to 2027', cy: '2026 i 2027' };

export const TERMS: Term[] = [
    { name: { en: 'Autumn Term 2026', cy: 'Tymor yr Hydref 2026' }, starts: '2026-09-01', halfTerm: ['2026-10-26', '2026-10-30'], ends: '2026-12-18' },
    { name: { en: 'Spring Term 2027', cy: 'Tymor y Gwanwyn 2027' }, starts: '2027-01-04', halfTerm: ['2027-02-08', '2027-02-12'], ends: '2027-03-19' },
    { name: { en: 'Summer Term 2027', cy: 'Tymor yr Haf 2027' }, starts: '2027-04-05', halfTerm: ['2027-05-31', '2027-06-04'], ends: '2027-07-20' },
];
