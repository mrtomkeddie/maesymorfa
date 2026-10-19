'use client';

import { format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { ArrowRight, CalendarDays, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../LanguageProvider';
import { useCalendar } from '@/hooks/useCalendar';
import { AddToCalendar } from '@/components/AddToCalendar';
import { PageHeader } from '@/components/public/PageHeader';
import { eventDays, isStillOn, lastDayOf, ukDay, ukTime } from '@/lib/utils';

// Public list of upcoming whole-school events. The full /calendar lives in the parent portal,
// which is switched off for the public site, so homepage links come here instead.
const content = {
    en: {
        title: 'Upcoming Events',
        subtitle: 'Dates for the whole school community',
        allDay: 'All day',
        none: 'No upcoming events scheduled.',
        readMore: 'Read more',
        termDates: 'Looking for holidays? See the term dates',
    },
    cy: {
        title: 'Digwyddiadau i Ddod',
        subtitle: 'Dyddiadau i gymuned gyfan yr ysgol',
        allDay: 'Drwy’r dydd',
        none: 'Dim digwyddiadau i ddod.',
        readMore: 'Darllen mwy',
        termDates: 'Chwilio am wyliau? Gweler dyddiadau’r tymor',
    },
};

// Event details longer than this (in characters) are cut to 8 lines when the full story is a link away
const LONG_DETAILS = 500;

export default function EventsPage() {
    const { language } = useLanguage();
    const t = content[language];
    const locale = language === 'cy' ? { locale: cyLocale } : undefined;
    const { events } = useCalendar();

    const upcoming = events.filter((event) => {
        const relevantTo = (event as { relevantTo?: string[] }).relevantTo;
        // An event over several days stays listed until its last day
        return isStillOn(event) && (!relevantTo || relevantTo.includes('All'));
    }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    // Group by month, in date order
    const months: { key: string; label: string; items: typeof upcoming }[] = [];
    upcoming.forEach((event) => {
        const d = ukDay(event.start);
        const key = format(d, 'yyyy-MM');
        let group = months.find((m) => m.key === key);
        if (!group) {
            group = { key, label: format(d, 'MMMM yyyy', locale), items: [] };
            months.push(group);
        }
        group.items.push(event);
    });

    return (
        <div className="bg-background">
        <PageHeader title={t.title} intro={t.subtitle}>
            <div className="pt-6">
                <AddToCalendar variant="default" />
            </div>
        </PageHeader>
        <div className="container mx-auto max-w-3xl px-6 md:px-8 pb-16 pt-4">

            {months.length === 0 ? (
                <div className="rounded-2xl bg-sky-50 py-12 text-center text-muted-foreground">
                    <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>{t.none}</p>
                </div>
            ) : (
                <div className="space-y-10">
                    {months.map((month) => (
                        <section key={month.key}>
                            <h2 className="font-headline text-2xl font-bold mb-4 capitalize">{month.label}</h2>
                            <ul className="space-y-3">
                                {month.items.map((event) => {
                                    const description = language === 'en' ? event.description_en : event.description_cy;
                                    return (
                                        <li key={event.id} className="flex items-start gap-4 rounded-2xl bg-sky-50 p-5">
                                            <div className="shrink-0 w-14 rounded-xl bg-white py-2 text-center shadow-sm">
                                                <span className="block font-headline text-2xl font-bold leading-none">{format(ukDay(event.start), 'd')}</span>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{format(ukDay(event.start), 'EEE', locale)}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-headline text-xl font-semibold leading-snug">{language === 'en' ? event.title_en : event.title_cy}</p>
                                                <p className="mt-1 text-sm text-sky-800 flex items-center gap-1 font-semibold">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {lastDayOf(event.start, event.end)
                                                        ? `${eventDays(event.start, event.end, language)}${event.allDay ? '' : `, ${ukTime(event.start)}`}`
                                                        : event.allDay ? t.allDay : ukTime(event.start)}
                                                </p>
                                                {/* Keeps the line breaks staff type. Short details show in full; a long letter
                                                    with a full story to link to shows its start and "Read more" */}
                                                {description && (
                                                    <p className={`mt-2 whitespace-pre-line text-sm text-muted-foreground ${event.newsSlug && description.length > LONG_DETAILS ? 'line-clamp-[8]' : ''}`}>
                                                        {description.trim()}
                                                    </p>
                                                )}
                                                {event.newsSlug && (
                                                    <Link href={`/news/${encodeURIComponent(event.newsSlug)}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-800 hover:underline">
                                                        {t.readMore} <ArrowRight className="h-4 w-4" />
                                                    </Link>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            <p className="mt-10 text-center">
                <Link href="/key-info#term-dates" className="text-sm font-semibold text-primary hover:underline">
                    {t.termDates}
                </Link>
            </p>
        </div>
        </div>
    );
}
