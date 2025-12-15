'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarPlus,
  Paperclip,
  Filter,
  ArrowRight,
  CreditCard,
  List,
  Grid3X3
} from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import { parentChildrenYearGroups } from '@/lib/mockData';
import { useCalendar } from '@/hooks/useCalendar';
// import { calendarEvents } from '@/lib/mockCalendar'; 
import { Calendar } from '@/components/ui/calendar';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

const content = {
  en: {
    title: 'School Calendar',
    description: 'Upcoming events, holidays, and important dates for the school year.',
    allDay: 'All Day',
    noEventsList: 'No events found.',
    subscribeButton: 'Subscribe',
    subscribeDescription: 'Auto-update your calendar app',
    attachments: 'Attachments',
    filterLabel: "Only show my children",
    detailsButton: "View Details",
    payButton: "Pay on ParentPay",
    viewList: "List",
    viewGrid: "Grid",
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
    subscribeButton: 'Tanysgrifiwch',
    subscribeDescription: 'Diweddariad yn eich ap calendr',
    attachments: 'Atodiadau',
    filterLabel: "Dangos fy mhlant yn unig",
    detailsButton: "Gweld Manylion",
    payButton: "Talu ar ParentPay",
    viewList: "Rhestr",
    viewGrid: "Grid",
    tags: {
      Holiday: 'Gwyliau',
      INSET: 'Diwrnod HMS',
      Event: 'Digwyddiad Ysgol',
      Trip: 'Taith',
      'Parents Evening': 'Noson Rieni'
    }
  },
};

const tagColors: Record<string, string> = {
  Holiday: 'bg-blue-100 text-blue-800 border-blue-200',
  INSET: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Event: 'bg-green-100 text-green-800 border-green-200',
  Trip: 'bg-purple-100 text-purple-800 border-purple-200',
  'Parents Evening': 'bg-pink-100 text-pink-800 border-pink-200'
};

export default function CalendarPage() {
  const { language } = useLanguage();
  const t = content[language];
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Use abstract hook with parent data
  const {
    groupedEvents,
    events: allEvents,
    isFiltered,
    setIsFiltered
  } = useCalendar(parentChildrenYearGroups);


  const EventItem = ({ event }: { event: any }) => {
    const newsSlug = event.title_en.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    const isTrip = event.tags.includes('Trip');

    return (
      <Card className="transition-all hover:shadow-md border-l-4" style={{ borderLeftColor: event.tags.includes('INSET') ? '#fcd34d' : event.tags.includes('Trip') ? '#c084fc' : undefined }}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-grow space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg">{event[language === 'en' ? 'title_en' : 'title_cy']}</h3>
                {isTrip && (
                  <Button size="sm" className="bg-[#00a9e0] hover:bg-[#008bb8] text-white h-7 gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span className="text-xs">{t.payButton}</span>
                  </Button>
                )}
              </div>

              <div className="text-sm text-muted-foreground">
                {event.allDay ? t.allDay : `${format(new Date(event.start), 'p')} ${event.end ? `- ${format(new Date(event.end), 'p')}` : ''}`}
              </div>
              <p className="text-sm">
                {event[language === 'en' ? 'description_en' : 'description_cy']}
              </p>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag: string) => (
                  <Badge key={tag} className={cn('font-normal', tagColors[tag])}>{t.tags[tag as keyof typeof t.tags]}</Badge>
                ))}
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {event.attachments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1 flex items-center gap-1"><Paperclip className="h-4 w-4" /> {t.attachments}</h4>
                    <div className="flex flex-col items-start gap-1">
                      {event.attachments.map((att: any) => (
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
            <div className="hidden md:block text-center font-bold text-primary shrink-0 w-16 bg-muted/20 rounded p-2">
              <div className="text-2xl">{format(new Date(event.start), 'dd')}</div>
              <div className="text-xs uppercase">{format(new Date(event.start), 'MMM')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const GridView = () => {
    // Get dates with events for dot indicators
    const daysWithEvents = allEvents.map((e: any) => new Date(e.start));

    // Filter events for selected date
    const selectedDateEvents = selectedDate
      ? allEvents.filter((e: any) => isSameDay(new Date(e.start), selectedDate))
      : [];

    return (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <Card className="col-span-1 md:col-span-5 lg:col-span-4 h-fit">
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border-0 w-full flex justify-center p-4"
              modifiers={{
                event: daysWithEvents
              }}
              modifiersStyles={{
                event: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'var(--primary)',
                  textDecorationThickness: '2px'
                }
              }}
            />
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-7 lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {selectedDate ? format(selectedDate, 'EEEE, d MMMM yyyy') : 'Select a date'}
            </h2>
          </div>

          {selectedDateEvents.length > 0 ? (
            <div className="space-y-4">
              {selectedDateEvents.map((event: any) => (
                <EventItem key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border-dashed border-2">
              <p>No events scheduled for this day.</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const ListView = () => (
    <div className="space-y-6">
      {Object.entries(groupedEvents).length > 0 ? (
        Object.entries(groupedEvents).map(([date, eventsOnDay]) => (
          <div key={date} className="relative pl-8 md:pl-0">
            {/* Timeline decoration */}
            <div className="absolute left-0 top-0 h-full w-px bg-primary/20 md:hidden" />
            <div className="absolute left-[-5px] top-4 h-2.5 w-2.5 rounded-full bg-primary md:hidden ring-4 ring-background" />

            <div className="mb-4 sticky top-16 md:static z-10 bg-background/95 backdrop-blur py-2 md:bg-transparent">
              <h2 className="font-bold text-lg text-primary flex items-center gap-2">
                <span className="inline-block md:hidden">{format(new Date(date), "EEEE, d MMM")}</span>
                <span className="hidden md:inline-block">{format(new Date(date), "EEEE, d MMMM yyyy")}</span>
              </h2>
            </div>

            <div className="space-y-4">
              {eventsOnDay.map((event: any) => <EventItem key={event.id} event={event} />)}
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <div className="flex items-center gap-2 bg-muted p-1 rounded-lg shrink-0">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grid')}>
            <TabsList>
              <TabsTrigger value="grid" className="gap-2"><Grid3X3 className="h-4 w-4" /> {t.viewGrid}</TabsTrigger>
              <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> {t.viewList}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border p-4 bg-card shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="bg-primary/10 p-2 rounded-full">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="filter-switch" className="text-sm font-medium cursor-pointer">
              {t.filterLabel}
            </Label>
            <Switch id="filter-switch" checked={isFiltered} onCheckedChange={setIsFiltered} />
          </div>
        </div>

        <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
          <Separator orientation="vertical" className="h-6 hidden sm:block" />
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a href="/api/calendar">
              <CalendarPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{t.subscribeButton}</span>
            </a>
          </Button>
        </div>
      </div>

      {viewMode === 'list' ? <ListView /> : <GridView />}
    </div>
  );
}

function Separator({ orientation, className }: { orientation?: 'horizontal' | 'vertical', className?: string }) {
  return <div className={cn("bg-border", orientation === 'vertical' ? "w-px" : "h-px", className)} />
}
