import { NextResponse } from 'next/server';
import { createICalFeed } from '@/lib/ical';
import { calendarEvents } from '@/lib/mockCalendar';

// This route handler generates and serves the iCalendar (.ics) file.
// Calendar applications can subscribe to this URL to get live updates.
export async function GET() {
  const icalData = createICalFeed(calendarEvents);

  if (!icalData) {
    return new NextResponse('Error generating iCal feed', { status: 500 });
  }

  // We return the data with a 'text/calendar' content type.
  // Most modern calendar clients will interpret this as a subscription feed.
  return new NextResponse(icalData, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}
