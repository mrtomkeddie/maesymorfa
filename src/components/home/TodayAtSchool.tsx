'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { ArrowRight, BellRing, CalendarDays, Utensils } from 'lucide-react';
import { db } from '@/lib/db';
import type { WeeklyMenu } from '@/lib/types';
import { useCalendar } from '@/hooks/useCalendar';
import { useNews } from '@/hooks/useNews';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { RevealGroup, RevealItem } from '@/components/motion/Reveal';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const content = {
    en: {
        heading: 'Today at school',
        lunchToday: "Today's lunch",
        lunchMonday: "Monday's lunch",
        or: 'or',
        pudding: 'Pudding',
        nextEvent: 'Coming up',
        noEvents: 'Nothing on the calendar this week.',
        notice: 'Latest notice',
        allDay: 'All day',
        links: [
            { label: 'Term dates', href: '/key-info#term-dates' },
            { label: 'Uniform', href: '/key-info#uniform' },
            { label: 'Full lunch menu', href: '/key-info#lunch-menu' },
            { label: 'Calendar', href: '/calendar' },
        ],
    },
    cy: {
        heading: "Heddiw yn yr ysgol",
        lunchToday: 'Cinio heddiw',
        lunchMonday: 'Cinio dydd Llun',
        or: 'neu',
        pudding: 'Pwdin',
        nextEvent: 'I ddod',
        noEvents: "Dim byd ar y calendr yr wythnos hon.",
        notice: 'Hysbysiad diweddaraf',
        allDay: 'Drwy’r dydd',
        links: [
            { label: 'Dyddiadau tymor', href: '/key-info#term-dates' },
            { label: 'Gwisg ysgol', href: '/key-info#uniform' },
            { label: 'Bwydlen lawn', href: '/key-info#lunch-menu' },
            { label: 'Calendr', href: '/calendar' },
        ],
    },
};

// Sits under the hero: the three things a parent checks most, without leaving the homepage.
export function TodayAtSchool() {
    const { language } = useLanguage();
    const t = content[language];
    const { events } = useCalendar();
    const { urgentNews, latestNews } = useNews();
    const [menu, setMenu] = useState<WeeklyMenu | null>(null);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
        db.getWeeklyMenu().then(setMenu).catch(console.error);
    }, []);

    // Weekends show Monday's menu, so the card is never empty.
    const dayIndex = now?.getDay() ?? 1;
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const lunch = menu?.[isWeekend ? 'monday' : DAYS[dayIndex]];

    const startOfToday = now ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) : null;
    const nextEvent = startOfToday ? events.find((e) => new Date(e.start) >= startOfToday) : undefined;

    const notice = urgentNews ?? latestNews[0];
    const locale = language === 'cy' ? { locale: cyLocale } : undefined;

    return (
        <section className="relative z-20 container mx-auto max-w-7xl px-6 md:px-8 -mt-2 md:-mt-6 mb-16">
            <div className="rounded-3xl bg-white shadow-[0_24px_60px_-28px_rgba(30,60,90,0.35)] ring-1 ring-black/5 p-5 md:p-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-5">
                    <h2 className="font-headline text-2xl md:text-3xl font-bold">{t.heading}</h2>
                    <p className="text-sm font-medium text-muted-foreground" suppressHydrationWarning>
                        {now ? format(now, 'EEEE d MMMM', locale) : ' '}
                    </p>
                </div>

                <RevealGroup className="grid gap-4 md:grid-cols-3">
                    <RevealItem className="h-full">
                        <div className="h-full rounded-2xl bg-amber-50 p-5">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                                <Utensils className="h-4 w-4" /> {isWeekend ? t.lunchMonday : t.lunchToday}
                            </p>
                            {lunch ? (
                                <>
                                    <p className="mt-3 font-headline text-xl font-semibold leading-snug">{lunch.main}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t.or} {lunch.alt}
                                    </p>
                                    <p className="mt-2 text-sm">
                                        <span className="font-semibold">{t.pudding}:</span> {lunch.dessert}
                                    </p>
                                </>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    <div className="h-5 w-3/4 rounded bg-amber-100 animate-pulse" />
                                    <div className="h-4 w-1/2 rounded bg-amber-100 animate-pulse" />
                                </div>
                            )}
                        </div>
                    </RevealItem>

                    <RevealItem className="h-full">
                        <Link href="/calendar" className="group block h-full rounded-2xl bg-sky-50 p-5 transition-colors hover:bg-sky-100">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700">
                                <CalendarDays className="h-4 w-4" /> {t.nextEvent}
                            </p>
                            {nextEvent ? (
                                <div className="mt-3 flex items-start gap-4">
                                    <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-center shadow-sm">
                                        <span className="block font-headline text-2xl font-bold leading-none">{format(new Date(nextEvent.start), 'd')}</span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {format(new Date(nextEvent.start), 'MMM', locale)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-headline text-xl font-semibold leading-snug group-hover:text-sky-800">
                                            {language === 'en' ? nextEvent.title_en : nextEvent.title_cy}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {nextEvent.allDay ? t.allDay : format(new Date(nextEvent.start), 'p')}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-3 text-sm text-muted-foreground">{t.noEvents}</p>
                            )}
                        </Link>
                    </RevealItem>

                    <RevealItem className="h-full">
                        {notice && (
                            <Link
                                href={`/news/${notice.slug}`}
                                className={`group block h-full rounded-2xl p-5 transition-colors ${notice.isUrgent ? 'bg-red-50 hover:bg-red-100' : 'bg-rose-50 hover:bg-rose-100'}`}
                            >
                                <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${notice.isUrgent ? 'text-red-700' : 'text-primary'}`}>
                                    <BellRing className="h-4 w-4" /> {t.notice}
                                </p>
                                <p className="mt-3 font-headline text-xl font-semibold leading-snug">
                                    {language === 'en' ? notice.title_en : notice.title_cy}
                                </p>
                                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                                    {language === 'en' ? 'Read more' : 'Darllen mwy'}
                                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </span>
                            </Link>
                        )}
                    </RevealItem>
                </RevealGroup>

                <nav className="mt-5 flex flex-wrap gap-2" aria-label={t.heading}>
                    {t.links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </section>
    );
}
