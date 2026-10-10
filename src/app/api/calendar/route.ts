import { NextResponse } from 'next/server';
import { createICalFeed } from '@/lib/ical';
import { db } from '@/lib/db';
import { TERMS } from '@/lib/termDates';

// The school calendar as a subscription feed (.ics). Parents add this address to their phone's
// calendar once; the phone then re-checks it by itself, so new events appear without them visiting the site.
export const dynamic = 'force-dynamic';

export async function GET() {
    const events: { id: string; title_en: string; description_en?: string; start: string; end?: string; allDay?: boolean; relevantTo?: string[] }[] =
        await db.getCalendarEvents();
    const wholeSchool = events.filter((event) => {
        // Never send the built-in sample events to parents' phones; they would stay in their calendars
        if (event.id.startsWith('mock_')) return false;
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
