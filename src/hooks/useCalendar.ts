import { useState, useMemo } from 'react';
import { calendarEvents, CalendarEvent } from '@/lib/mockCalendar';

export function useCalendar(filteredYearGroups: string[] = []) {
    const [isFiltered, setIsFiltered] = useState(false);

    const events = useMemo(() => {
        // Sort events by date
        return [...calendarEvents].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, []);

    const filteredEvents = useMemo(() => {
        if (!isFiltered || filteredYearGroups.length === 0) {
            return events;
        }

        return events.filter(event => {
            // If event has no specific relevance, it's relevant to all
            if (!event.relevantTo || event.relevantTo.length === 0 || event.relevantTo.includes('All')) {
                return true;
            }
            // Check if event is relevant to any of the user's children's year groups
            return filteredYearGroups.some(year => event.relevantTo?.includes(year as any));
        });
    }, [events, isFiltered, filteredYearGroups]);

    const groupedEvents = useMemo(() => {
        const groups: Record<string, CalendarEvent[]> = {};
        filteredEvents.forEach(event => {
            const dateKey = new Date(event.start).toDateString();
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(event);
        });
        return groups;
    }, [filteredEvents]);

    return {
        events,
        filteredEvents,
        groupedEvents,
        isFiltered,
        setIsFiltered
    };
}
