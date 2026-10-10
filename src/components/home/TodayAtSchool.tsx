'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { ArrowRight, BellRing, CalendarDays, ExternalLink, Utensils } from 'lucide-react';
import { db } from '@/lib/db';
import { weekMenuFor, WEEK_DAYS } from '@/lib/lunchMenu';
import { PARENTPAY_URL } from '@/lib/links';
import { useCalendar } from '@/hooks/useCalendar';
import { useNews } from '@/hooks/useNews';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { RevealGroup, RevealItem } from '@/components/motion/Reveal';


const content = {
    en: {
        heading: 'Today at school',
        lunchToday: "Today's lunch",
        lunchMonday: "Monday's lunch",
        or: 'Vegetarian:',
        noLunch: 'No school lunches this week. See the full menu for what is next.',
        pudding: 'Pudding',
        nextEvent: 'Coming up',
        noEvents: 'Nothing on the calendar this week.',
        notice: 'Latest notice',
        allDay: 'All day',
        fullMenu: 'Full menu',
        fullCalendar: 'Full calendar',
        readMore: 'Read more',
        // The cards above already open the lunch menu and the calendar
        links: [
            { label: 'Term dates', href: '/key-info#term-dates' },
            { label: 'Uniform', href: '/key-info#uniform' },
            { label: 'ParentPay: trips, lunches & forms', href: PARENTPAY_URL },
        ],
    },
    cy: {
        heading: "Heddiw yn yr ysgol",
        lunchToday: 'Cinio heddiw',
        lunchMonday: 'Cinio dydd Llun',
        or: 'Llysieuol:',
        noLunch: 'Dim cinio ysgol yr wythnos hon. Gweler y fwydlen lawn.',
        pudding: 'Pwdin',
        nextEvent: 'I ddod',
        noEvents: "Dim byd ar y calendr yr wythnos hon.",
        notice: 'Hysbysiad diweddaraf',
        allDay: 'Drwy’r dydd',
        fullMenu: 'Bwydlen lawn',
        fullCalendar: 'Calendr llawn',
        readMore: 'Darllen mwy',
        links: [
            { label: 'Dyddiadau tymor', href: '/key-info#term-dates' },
            { label: 'Gwisg ysgol', href: '/key-info#uniform' },
            { label: 'ParentPay: tripiau, cinio a ffurflenni', href: PARENTPAY_URL },
        ],
    },
};

// The "this card opens something" line at the foot of each card.
function CardCue({ label, className }: { label: string; className: string }) {
    return (
        <span className={`mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold ${className}`}>
            {label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
    );
}

// Sits under the hero: the three things a parent checks most, without leaving the homepage.
export function TodayAtSchool() {
    const { language } = useLanguage();
    const t = content[language];
    const { events } = useCalendar();
    const { urgentNews, latestNews } = useNews();
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
    }, []);

    // Weekends show next Monday's lunch, so the card is never empty.
    const dayIndex = now?.getDay() ?? 1;
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const week = now ? weekMenuFor(now) : null;
    const lunch = week ? week.days[WEEK_DAYS[isWeekend ? 0 : dayIndex - 1]] : null;

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
                        <Link href="/key-info#lunch-menu" className="group flex h-full flex-col rounded-2xl bg-amber-50 p-5 transition-colors hover:bg-amber-100">
                            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                                <Utensils className="h-4 w-4" /> {isWeekend ? t.lunchMonday : t.lunchToday}
                            </p>
                            {lunch ? (
                                <>
                                    <p className="mt-3 font-headline text-xl font-semibold leading-snug">{lunch.main}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {t.or} {lunch.vegetarian}
                                    </p>
                                    <p className="mt-2 text-sm">
                                        <span className="font-semibold">{t.pudding}:</span> {lunch.dessert}
                                    </p>
                                </>
                            ) : now ? (
                                <p className="mt-3 text-sm text-muted-foreground">{t.noLunch}</p>
                            ) : (
                                <div className="mt-3 space-y-2">
                                    <div className="h-5 w-3/4 rounded bg-amber-100 animate-pulse" />
                                    <div className="h-4 w-1/2 rounded bg-amber-100 animate-pulse" />
                                </div>
                            )}
                            <CardCue label={t.fullMenu} className="text-amber-800" />
                        </Link>
                    </RevealItem>

                    <RevealItem className="h-full">
                        <Link href="/events" className="group flex h-full flex-col rounded-2xl bg-sky-50 p-5 transition-colors hover:bg-sky-100">
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
                            <CardCue label={t.fullCalendar} className="text-sky-800" />
                        </Link>
                    </RevealItem>

                    <RevealItem className="h-full">
                        {notice && (
                            <Link
                                href={`/news/${notice.slug}`}
                                className={`group flex h-full flex-col rounded-2xl p-5 transition-colors ${notice.isUrgent ? 'bg-red-50 hover:bg-red-100' : 'bg-rose-50 hover:bg-rose-100'}`}
                            >
                                <p className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${notice.isUrgent ? 'text-red-700' : 'text-primary'}`}>
                                    <BellRing className="h-4 w-4" /> {t.notice}
                                </p>
                                <p className="mt-3 font-headline text-xl font-semibold leading-snug">
                                    {language === 'en' ? notice.title_en : notice.title_cy}
                                </p>
                                <CardCue label={t.readMore} className="text-primary" />
                            </Link>
                        )}
                    </RevealItem>
                </RevealGroup>

                <nav className="mt-5 flex flex-wrap gap-2" aria-label={t.heading}>
                    {t.links.map((link) => {
                        const external = link.href.startsWith('http');
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                className="inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                            >
                                {link.label}
                                {external && <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </section>
    );
}
