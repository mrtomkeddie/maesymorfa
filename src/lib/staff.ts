// Staff list, copied from the school's own website (ysgolmaesymorfa.com, "Who's Who").
// Welsh job titles are the school's own; where the school gives none, the English title is used in both languages.
import type { Bilingual } from './schoolClasses';
// Class teachers are listed per class in schoolClasses.ts (the About page shows them as class cards).

export type StaffMember = { name: string; role: Bilingual };
export type StaffGroup = { name: Bilingual; members: StaffMember[] };

const same = (text: string): Bilingual => ({ en: text, cy: text });

const leadership: StaffGroup = {
    name: { en: 'Senior Leadership Team', cy: 'Uwch Dîm Arwain' },
    members: [
        { name: 'Ms L Jones', role: { en: 'Headteacher', cy: 'Pennaeth' } },
        {
            name: 'Mr R Gravell',
            role: {
                en: 'Deputy Headteacher. Teaching and Learning, Assessment and Curriculum Leader',
                cy: 'Dirprwy Bennaeth. Teaching and Learning, Assessment and Curriculum Leader',
            },
        },
        { name: 'Miss J Barclay', role: { en: 'ALNCO', cy: 'Cydlynydd Anghenion Addysgu' } },
        { name: 'Mrs J Sharpe', role: { en: 'School Business Manager', cy: 'Rheolwr Busnes yr Ysgol' } },
    ],
};

const wellbeing: StaffGroup = {
    name: { en: 'Wellbeing and Support', cy: 'Lles a Chymorth' },
    members: [
        { name: 'Mrs J Morgan', role: same('Emotional Literacy Support (ELSA)') },
        { name: 'Miss K Wilks', role: same('Behaviour Support Officer') },
        { name: 'Mr O Poole', role: same('Wellbeing Team') },
        { name: 'Miss S Bowen', role: same('High Level Teaching Assistant (HLTA)') },
    ],
};

const assistantRole: Bilingual = { en: 'Support Assistant', cy: 'Cynorthwywr Cyfnod Sylfaen' };
const assistants: StaffGroup = {
    name: { en: 'Learning Support Assistants', cy: 'Cynorthwywyr' },
    members: ['Miss C Miller', 'Miss L Davies', 'Miss A Rogers', 'Mrs J Kelleher', 'Miss T Evans'].map((name) => ({ name, role: assistantRole })),
};

const siteAndKitchen: StaffGroup = {
    name: { en: 'Site and Kitchen', cy: 'Safle a Chegin' },
    members: [
        { name: 'Mr P Conlon', role: { en: 'Caretaker', cy: 'Gofalwr' } },
        { name: 'Mrs T Kozalski-Evans', role: { en: 'Cook', cy: 'Cogyddes' } },
        { name: 'Mrs L Radacanu', role: { en: 'Kitchen', cy: 'Cegin' } },
        { name: 'Miss C Kozalski', role: { en: 'Kitchen', cy: 'Cegin' } },
    ],
};

const lunchRole: Bilingual = { en: 'Lunchtime Supervisor', cy: 'Cynorthwywr Cinio' };
const lunchtime: StaffGroup = {
    name: { en: 'Lunchtime Supervisors', cy: 'Cynorthwywyr Cinio' },
    members: [
        'Mrs J Kelleher', 'Mrs J Morgan', 'Miss C Miller', 'Miss A Rogers', 'Mrs C Evans',
        'Mr P Conlon', 'Miss Edyta', 'Miss J Palethorpe', 'Mrs A Hurden',
    ].map((name) => ({ name, role: lunchRole })),
};

export const STAFF_GROUPS: StaffGroup[] = [leadership, wellbeing, assistants, siteAndKitchen, lunchtime];
