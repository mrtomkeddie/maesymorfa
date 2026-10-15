import { NextResponse } from 'next/server';
import { createICalFeed } from '@/lib/ical';
import { db } from '@/lib/db';
import { TERMS } from '@/lib/termDates';

// The school calendar as a subscription feed (.ics). Parents add this address to their phone's
// calendar once; the phone then re-checks it by itself, so new events appear without them visiting the site.
export const dynamic = 'force-dynamic';

const isDate = (value: unknown) => typeof value === 'string' && !Number.isNaN(new Date(value).getTime());

export async function GET() {
    let events: { id: string; title_en: string; description_en?: string; start: string; end?: string; allDay?: boolean; relevantTo?: string[] }[];
    try {
        events = await db.getCalendarEvents();
    } catch (error) {
        // Never answer with a feed that is missing the school's events: phones would delete them.
        // An error makes phones keep what they have and try again later.
        console.error('Calendar feed could not read events:', error);
        return new NextResponse('The school calendar is unavailable right now. Please try again later.', {
            status: 503,
            headers: { 'Retry-After': '600', 'Cache-Control': 'no-store' },
        });
    }
    const wholeSchool = events.filter((event) => {
        // Never send the built-in sample events to parents' phones; they would stay in their calendars
        if (event.id.startsWith('mock_')) return false;
        // Skip anything malformed rather than let one bad entry break the whole feed
        if (typeof event.title_en !== 'string' || !isDate(event.start) || (event.end !== undefined && !isDate(event.end))) return false;
        if (event.relevantTo !== undefined && !Array.isArray(event.relevantTo)) return false;
        // Whole-school events only (events with no audience list count as whole-school)
        return !event.relevantTo || event.relevantTo.includes('All');
    });

    const icalData = createICalFeed(wholeSchool, TERMS);
    if (!icalData) {
        return new NextResponse('Error generating iCal feed', { status: 500 });
    }

    return new NextResponse(icalData, {
        status: 200,
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': 'inline; filename="maes-y-morfa.ics"',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
    });
}
