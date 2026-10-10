import { createEvents, EventAttributes, DateArray } from 'ics';
import type { Term } from './termDates';

// The shape the feed needs from a calendar event (matches the site's events)
type FeedEvent = {
    id: string;
    title_en: string;
    description_en?: string;
    start: string;
    end?: string;
    allDay?: boolean;
};

const dateOnly = (d: Date): DateArray => [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
const dateTime = (d: Date): DateArray => [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes()];
const isoDay = (iso: string) => new Date(iso + 'T00:00:00Z');
const nextDay = (d: Date) => new Date(d.getTime() + 86_400_000);

// All-day entries use date-only start and an exclusive end (the day after), which is what calendar apps expect
function allDay(uid: string, title: string, first: Date, last: Date, description?: string): EventAttributes {
    return { uid, title, description, start: dateOnly(first), end: dateOnly(nextDay(last)) };
}

function termEvents(terms: Term[]): EventAttributes[] {
    return terms.flatMap((term) => {
        const key = term.starts;
        return [
            allDay(`term-start-${key}@maesymorfa`, `${term.name.en} starts`, isoDay(term.starts), isoDay(term.starts)),
            allDay(`half-term-${key}@maesymorfa`, 'Half term (school closed)', isoDay(term.halfTerm[0]), isoDay(term.halfTerm[1])),
            allDay(`term-end-${key}@maesymorfa`, `Last day of ${term.name.en}`, isoDay(term.ends), isoDay(term.ends)),
        ];
    });
}

// Builds the subscription feed. UIDs stay the same between refreshes, so phones update events instead of duplicating them.
export function createICalFeed(events: FeedEvent[], terms: Term[] = []) {
    const schoolEvents: EventAttributes[] = events.map((event) => {
        const uid = `event-${event.id}@maesymorfa`;
        const start = new Date(event.start);
        const end = event.end ? new Date(event.end) : undefined;
        if (event.allDay) {
            return allDay(uid, event.title_en, start, end && end > start ? end : start, event.description_en);
        }
        return {
            uid,
            title: event.title_en,
            description: event.description_en,
            start: dateTime(start),
            startInputType: 'utc',
            startOutputType: 'utc',
            end: dateTime(end && end > start ? end : new Date(start.getTime() + 60 * 60 * 1000)),
            endInputType: 'utc',
            endOutputType: 'utc',
        };
    });

    const { error, value } = createEvents([...termEvents(terms), ...schoolEvents], {
        calName: 'Ysgol Maes Y Morfa',
        productId: 'maesymorfa/calendar',
        method: 'PUBLISH',
    });

    if (error) {
        console.error('Error creating iCal feed:', error);
        return null;
    }
    return value;
}
