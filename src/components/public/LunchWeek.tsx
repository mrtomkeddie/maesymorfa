'use client';

import { useEffect, useState } from 'react';
import { addDays, format, isSameDay } from 'date-fns';
import { cy as cyLocale, enGB } from 'date-fns/locale';
import { IceCream, Utensils } from 'lucide-react';
import { weekMenuFor, WEEK_DAYS, COUNCIL_MENU_URL, type LunchDay } from '@/lib/lunchMenu';
import { useLunchMenus } from '@/hooks/useLunchMenus';
import { cn } from '@/lib/utils';
import { SectionHeading, Tile, TileLabel } from './Tiles';

const content = {
    en: {
        title: 'Lunch menu',
        week: (n: number) => `Week ${n} of 3`,
        wc: 'w/c',
        intro: 'Carmarthenshire’s primary school menu runs on a three-week cycle. Fresh fruit and water are there every day. For allergies, please speak to our school cook.',
        vegetarian: 'Vegetarian:',
        or: 'Or:',
        pudding: 'Pudding',
        servedWith: 'Served with:',
        salad: 'Salad:',
        today: 'Today',
        days: 'Pick a day',
        noMenu: 'No menu for this week yet.',
        council: 'See the council’s school meals page',
    },
    cy: {
        title: 'Bwydlen ginio',
        week: (n: number) => `Wythnos ${n} o 3`,
        wc: 'w/d',
        intro: 'Mae bwydlen ysgolion cynradd Sir Gâr yn rhedeg ar gylch tair wythnos. Mae ffrwythau ffres a dŵr ar gael bob dydd. Am alergeddau, siaradwch â chogydd yr ysgol.',
        vegetarian: 'Llysieuol:',
        or: 'Neu:',
        pudding: 'Pwdin',
        servedWith: 'Gyda:',
        salad: 'Salad:',
        today: 'Heddiw',
        days: 'Dewiswch ddiwrnod',
        noMenu: 'Dim bwydlen ar gyfer yr wythnos hon eto.',
        council: 'Gweler tudalen prydau ysgol y cyngor',
    },
};

type Lang = keyof typeof content;
type Day = LunchDay & { date: Date };

// Main dish in the headline font, then the other choices: the same order as the homepage's lunch card
function Dishes({ day, t, big = false }: { day: Day; t: typeof content.en; big?: boolean }) {
    return (
        <div>
            <p className={cn('font-headline font-semibold leading-snug', big ? 'mt-3 text-2xl' : 'text-xl')}>{day.main}</p>
            <p className="mt-1 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground/80">{t.vegetarian}</span> {day.vegetarian}
            </p>
            {day.alternative && (
                <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground/80">{t.or}</span> {day.alternative}
                </p>
            )}
        </div>
    );
}

function ServedWith({ day, t }: { day: Day; t: typeof content.en }) {
    if (!day.sides && !day.salad) return null;
    return (
        <p className="mt-4 border-t border-amber-200/80 pt-3 text-xs text-muted-foreground">
            <span className="font-semibold">{t.servedWith}</span> {day.sides}{day.sides && '.'} {day.salad && `${t.salad} ${day.salad}.`}
        </p>
    );
}

// This week's school lunches. Desktop shows the whole week as five rows; phones show one day
// at a time with a row of day buttons, so the week is not a long scroll. Today is marked on both.
export function LunchWeek({ language, actions }: { language: Lang; actions?: React.ReactNode }) {
    const t = content[language];
    const locale = language === 'cy' ? cyLocale : enGB;
    const { menus: savedMenus } = useLunchMenus();
    // The date is read in the browser only, so the page the server sends matches what the browser draws
    const [now, setNow] = useState<Date | null>(null);
    const [picked, setPicked] = useState(0);

    useEffect(() => {
        const today = new Date();
        setNow(today);
        const weekday = today.getDay();
        if (weekday >= 1 && weekday <= 5) setPicked(weekday - 1);
    }, []);

    // At the weekend this shows next week
    const week = weekMenuFor(now ?? new Date(), savedMenus);
    const days: Day[] = week ? WEEK_DAYS.map((key, i) => ({ ...week.days[key], date: addDays(week.weekStart, i) })) : [];
    const isToday = (d: Date) => !!now && isSameDay(d, now);
    const note = week ? `${t.week(week.weekNumber)} · ${t.wc} ${format(week.weekStart, 'd MMMM', { locale })}` : undefined;
    const pickedDay = days[picked];

    return (
        <>
            <SectionHeading note={note}>{t.title}</SectionHeading>
            <p className="mb-6 max-w-2xl text-muted-foreground">{t.intro}</p>

            {!week ? (
                <Tile tone="amber">
                    <p className="text-sm">
                        {t.noMenu}{' '}
                        <a href={COUNCIL_MENU_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-800 underline">
                            {t.council}
                        </a>
                    </p>
                </Tile>
            ) : (
                <>
                    {/* Phones: one day at a time */}
                    <div className="md:hidden">
                        <div role="tablist" aria-label={t.days} className="mb-3 grid grid-cols-5 gap-2">
                            {days.map((day, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    role="tab"
                                    id={`lunch-tab-${i}`}
                                    aria-selected={picked === i}
                                    aria-controls="lunch-day"
                                    onClick={() => setPicked(i)}
                                    className={cn(
                                        'rounded-2xl py-2 text-center transition-colors',
                                        picked === i ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-300' : 'bg-white text-muted-foreground ring-1 ring-black/10',
                                    )}
                                >
                                    <span className="block text-[11px] font-bold uppercase tracking-wider">{format(day.date, 'EEE', { locale })}</span>
                                    <span className="block font-headline text-xl font-bold leading-tight">{format(day.date, 'd')}</span>
                                    <span className={cn('mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full', isToday(day.date) ? 'bg-amber-500' : 'bg-transparent')} aria-hidden="true" />
                                </button>
                            ))}
                        </div>
                        {pickedDay && (
                            <Tile tone="amber" id="lunch-day" role="tabpanel" aria-labelledby={`lunch-tab-${picked}`}>
                                <TileLabel tone="amber" icon={Utensils}>
                                    {format(pickedDay.date, 'EEEE d MMMM', { locale })}
                                    {isToday(pickedDay.date) && <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] text-white">{t.today}</span>}
                                </TileLabel>
                                <Dishes day={pickedDay} t={t} big />
                                <p className="mt-2 text-sm">
                                    <span className="font-semibold">{t.pudding}:</span> {pickedDay.dessert}
                                </p>
                                <ServedWith day={pickedDay} t={t} />
                            </Tile>
                        )}
                    </div>

                    {/* Tablets and up: the whole week */}
                    <ul className="hidden space-y-3 md:block">
                        {days.map((day, i) => {
                            const today = isToday(day.date);
                            return (
                                <li key={i}>
                                    <Tile tone="amber" className={cn(today && 'bg-amber-100 ring-2 ring-amber-300')}>
                                        <div className="grid grid-cols-[4rem_1fr_minmax(10rem,14rem)] items-start gap-5">
                                            <div className={cn('rounded-xl py-2 text-center shadow-sm', today ? 'bg-amber-500 text-white' : 'bg-white')}>
                                                <span className="block font-headline text-2xl font-bold leading-none">{format(day.date, 'd')}</span>
                                                <span className={cn('text-[11px] font-bold uppercase tracking-wider', today ? 'text-white' : 'text-muted-foreground')}>
                                                    {today ? t.today : format(day.date, 'EEE', { locale })}
                                                </span>
                                            </div>
                                            <Dishes day={day} t={t} />
                                            <div>
                                                <TileLabel tone="amber" icon={IceCream}>{t.pudding}</TileLabel>
                                                <p className="mt-1 text-sm">{day.dessert}</p>
                                            </div>
                                        </div>
                                        <div className="pl-[5.25rem]">
                                            <ServedWith day={day} t={t} />
                                        </div>
                                    </Tile>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}

            {actions && <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>}
        </>
    );
}
