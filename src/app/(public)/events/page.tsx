'use client';

import { format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { CalendarDays, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '../LanguageProvider';
import { useCalendar } from '@/hooks/useCalendar';

// Public list of upcoming whole-school events. The full /calendar lives in the parent portal,
// which is switched off for the public site, so homepage links come here instead.
const content = {
    en: {
        title: 'Upcoming Events',
        subtitle: 'Dates for the whole school community',
        allDay: 'All day',
        none: 'No upcoming events scheduled.',
        termDates: 'Looking for holidays? See the term dates',
    },
    cy: {
        title: 'Digwyddiadau i Ddod',
        subtitle: 'Dyddiadau i gymuned gyfan yr ysgol',
        allDay: 'Drwy’r dydd',
        none: 'Dim digwyddiadau i ddod.',
        termDates: 'Chwilio am wyliau? Gweler dyddiadau’r tymor',
    },
};

export default function EventsPage() {
    const { language } = useLanguage();
    const t = content[language];
    const locale = language === 'cy' ? { locale: cyLocale } : undefined;
    const { events } = useCalendar();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = events.filter((event) => {
        const relevantTo = (event as { relevantTo?: string[] }).relevantTo;
        return new Date(event.start) >= today && (!relevantTo || relevantTo.includes('All'));
    });

    // Group by month, in date order
    const months: { key: string; label: string; items: typeof upcoming }[] = [];
    upcoming.forEach((event) => {
        const d = new Date(event.start);
        const key = format(d, 'yyyy-MM');
        let group = months.find((m) => m.key === key);
        if (!group) {
            group = { key, label: format(d, 'MMMM yyyy', locale), items: [] };
            months.push(group);
        }
        group.items.push(event);
    });

    return (
        <div className="container mx-auto max-w-3xl px-6 md:px-8 py-12 md:py-16">
            <div className="text-center space-y-3 mb-10">
                <h1 className="text-4xl md:text-5xl font-bold font-headline tracking-tight">{t.title}</h1>
                <p className="text-lg text-muted-foreground">{t.subtitle}</p>
            </div>

            {months.length === 0 ? (
                <div className="rounded-2xl bg-secondary/60 py-12 text-center text-muted-foreground">
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
                                    const start = new Date(event.start);
                                    const description = language === 'en' ? event.description_en : event.description_cy;
                                    return (
                                        <li key={event.id} className="flex items-start gap-4 rounded-2xl bg-secondary/60 p-4">
                                            <div className="shrink-0 w-14 rounded-xl bg-white py-2 text-center shadow-sm">
                                                <span className="block font-headline text-2xl font-bold leading-none">{format(start, 'd')}</span>
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{format(start, 'EEE', locale)}</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold leading-tight">{language === 'en' ? event.title_en : event.title_cy}</p>
                                                <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 font-medium">
                                                    <Clock className="h-3 w-3" /> {event.allDay ? t.allDay : format(start, 'p')}
                                                </p>
                                                {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
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
    );
}
