
'use client';

import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarPlus,
  Paperclip,
  Filter,
  ArrowRight
} from 'lucide-react';
import { calendarEvents, CalendarEvent } from '@/lib/mockCalendar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { parentChildrenYearGroups } from '@/lib/mockData';

const content = {
  en: {
    title: 'School Calendar',
    description: 'Upcoming events, holidays, and important dates for the school year.',
    allDay: 'All Day',
    noEventsList: 'No events found.',
    subscribeButton: 'Subscribe to Calendar',
    subscribeDescription: '(Events auto-update in your calendar app)',
    attachments: 'Attachments',
    filterLabel: "Only show events for my children",
    detailsButton: "View Details",
    tags: {
      Holiday: 'Holiday',
      INSET: 'INSET Day',
      Event: 'School Event',
      Trip: 'Trip',
      'Parents Evening': 'Parents Evening'
    }
  },
  cy: {
    title: 'Calendr yr Ysgol',
    description: 'Digwyddiadau, gwyliau, a dyddiadau pwysig ar gyfer y flwyddyn ysgol.',
    allDay: 'Trwy\'r Dydd',
    noEventsList: 'Ni chanfuwyd unrhyw ddigwyddiadau.',
    subscribeButton: 'Tanysgrifio i\'r Calendr',
    subscribeDescription: '(Mae digwyddiadau\'n diweddaru\'n awtomatig yn eich ap calendr)',
    attachments: 'Atodiadau',
    filterLabel: "Dangos digwyddiadau ar gyfer fy mhlant yn unig",
    detailsButton: "Gweld Manylion",
    tags: {
      Holiday: 'Gwyliau',
      INSET: 'Diwrnod HMS',
      Event: 'Digwyddiad Ysgol',
      Trip: 'Taith',
      'Parents Evening': 'Noson Rieni'
    }
  },
};

const tagColors: Record<(typeof calendarEvents[0]['tags'][0]), string> = {
    Holiday: 'bg-blue-100 text-blue-800 border-blue-200',
    INSET: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Event: 'bg-green-100 text-green-800 border-green-200',
    Trip: 'bg-purple-100 text-purple-800 border-purple-200',
    'Parents Evening': 'bg-pink-100 text-pink-800 border-pink-200'
};


export default function CalendarPage() {
  const { language } = useLanguage();
  const t = content[language];
  const [isFiltered, setIsFiltered] = useState(false);
  
  const filteredEvents = useMemo(() => {
    if (!isFiltered) {
        return calendarEvents;
    }
    return calendarEvents.filter(event => {
        if (!event.relevantTo || event.relevantTo.length === 0 || event.relevantTo.includes('All')) {
            return true;
        }
        return parentChildrenYearGroups.some(year => event.relevantTo?.includes(year as any));
    });
  }, [isFiltered]);

  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce((acc, event) => {
        const eventDate = format(new Date(event.start), 'yyyy-MM-dd');
        if (!acc[eventDate]) {
            acc[eventDate] = [];
        }
        acc[eventDate].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);
  }, [filteredEvents]);


  const EventItem = ({ event }: { event: CalendarEvent }) => {
    const newsSlug = event.title_en.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    return (
        <Card className="transition-all hover:shadow-md">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-grow space-y-2">
                         <h3 className="font-bold text-lg">{event[language === 'en' ? 'title_en' : 'title_cy']}</h3>
                         <div className="text-sm text-muted-foreground">
                            {event.allDay ? t.allDay : `${format(new Date(event.start), 'p')} ${event.end ? `- ${format(new Date(event.end), 'p')}` : ''}`}
                        </div>
                        <p className="text-sm">
                            {event[language === 'en' ? 'description_en' : 'description_cy']}
                        </p>
                         <div className="flex flex-wrap gap-2">
                            {event.tags.map(tag => (
                            <Badge key={tag} className={cn('font-normal', tagColors[tag])}>{t.tags[tag]}</Badge>
                            ))}
                        </div>
                        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {event.attachments.length > 0 && (
                                <div>
                                <h4 className="text-sm font-semibold mb-1 flex items-center gap-1"><Paperclip className="h-4 w-4" /> {t.attachments}</h4>
                                <div className="flex flex-col items-start gap-1">
                                    {event.attachments.map(att => (
                                    <Button key={att.name} variant="link" size="sm" asChild className="p-0 h-auto">
                                        <a href={att.url} download>{att.name}</a>
                                    </Button>
                                    ))}
                                </div>
                                </div>
                            )}
                            {event.linkedNewsPostId && (
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/news/${newsSlug}`}>
                                        {t.detailsButton} <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                    <div className="hidden md:block text-center font-bold text-primary shrink-0">
                        <div className="text-4xl">{format(new Date(event.start), 'dd')}</div>
                        <div className="text-sm uppercase">{format(new Date(event.start), 'MMM')}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
  }

  const ListView = () => (
    <div className="space-y-4">
        {Object.entries(groupedEvents).length > 0 ? (
            Object.entries(groupedEvents).map(([date, eventsOnDay]) => (
                <div key={date} className="relative pl-8 md:pl-0">
                    {/* Timeline decoration */}
                    <div className="absolute left-0 top-0 h-full w-px bg-border md:hidden" />
                    <div className="absolute left-[-5px] top-1.5 h-3 w-3 rounded-full bg-primary md:hidden" />
                    
                    <div className="mb-4 md:hidden">
                        <h2 className="font-bold text-lg text-primary">{format(new Date(date), "EEEE, dd MMM")}</h2>
                    </div>

                    <div className="space-y-4">
                        {eventsOnDay.map(event => <EventItem key={event.id} event={event} />)}
                    </div>
                </div>
            ))
        ) : (
            <Card className="text-center p-8">
                <p className="text-muted-foreground">{t.noEventsList}</p>
            </Card>
        )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
      </div>
      
       <div className="flex items-center justify-between space-x-2 rounded-md border p-3 bg-muted/50">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="filter-switch" className="text-sm">
              {t.filterLabel}
            </Label>
            <Switch id="filter-switch" checked={isFiltered} onCheckedChange={setIsFiltered} />
          </div>
          <div className="text-right">
              <Button asChild size="sm">
                <a href="/api/calendar">
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  {t.subscribeButton}
                </a>
              </Button>
              <p className="text-xs text-muted-foreground mt-1">{t.subscribeDescription}</p>
          </div>
        </div>

      <ListView />
    </div>
  );
}
