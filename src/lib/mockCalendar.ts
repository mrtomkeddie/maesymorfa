
export const calendarEvents = [
    {
        id: 'trip-1',
        title_en: 'Year 6 Trip to Cardiff',
        title_cy: 'Taith Blwyddyn 6 i Gaerdydd',
        description_en: 'Educational visit to the Senedd.',
        description_cy: 'Ymweliad addysgol â\'r Senedd.',
        start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(), // 2 days from now
        end: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
        allDay: true,
        tags: ['Trip'],
        yearGroups: [6],
        attachments: []
    },
    {
        id: '1',
        title_en: 'Summer Term Begins',
        title_cy: 'Tymor yr Haf yn Dechrau',
        description_en: 'First day back for all pupils.',
        description_cy: 'Diwrnod cyntaf yn ôl i bob disgybl.',
        start: '2025-04-08T09:00:00',
        end: '2025-04-08T15:30:00',
        allDay: true,
        tags: ['Event'],
        yearGroups: [],
        attachments: []
    },
    {
        id: 'inset-1',
        title_en: 'INSET Day',
        title_cy: 'Diwrnod HMS',
        description_en: 'Staff training. School closed to pupils.',
        description_cy: 'Hyfforddiant staff. Ysgol ar gau i ddisgyblion.',
        start: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(),
        allDay: true,
        tags: ['INSET'],
        yearGroups: [],
        attachments: []
    }
];
