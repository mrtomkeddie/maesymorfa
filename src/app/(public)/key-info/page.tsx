'use client';

import { useLanguage } from './../LanguageProvider';
import { Download, ExternalLink, CalendarDays, Shirt, Utensils, ShieldCheck, Dumbbell } from "lucide-react";
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { enGB, cy as cyLocale } from 'date-fns/locale';
import { db } from '@/lib/db';
import type { DocumentWithId } from '@/lib/types';
import { PARENTPAY_URL } from '@/lib/links';
import { AddToCalendar } from '@/components/AddToCalendar';
import { TERMS, SCHOOL_YEAR } from '@/lib/termDates';
import { PageHeader } from '@/components/public/PageHeader';
import { LunchWeek } from '@/components/public/LunchWeek';
import { SectionHeading, Tile, TileLabel, pillLink } from '@/components/public/Tiles';
import { cn } from '@/lib/utils';

const content = {
    en: {
        title: "Key Information",
        intro: "Find essential information for parents, including term dates, uniform policies, and lunch menus.",
        termDates: {
            title: "Term Dates",
            body: "Carmarthenshire term dates for the school year. The school sets four more INSET (training) days, which will be added here.",
            halfTerm: "Half term:",
            thisTerm: "This term",
            button: "Download PDF"
        },
        uniform: {
            title: "School Uniform",
            daily: "Daily uniform",
            pe: "PE kit",
            button: "View Uniform Policy"
        },
        lunchMenu: {
            title: "Lunch Menu",
            parentPay: "Pay for lunches on ParentPay",
            button: "Download Lunch Menu"
        },
        policies: {
            title: "Statutory Policies",
            none: "No policies currently uploaded.",
        },
    },
    cy: {
        title: "Gwybodaeth Allweddol",
        intro: "Dewch o hyd i wybodaeth hanfodol i rieni, gan gynnwys dyddiadau tymor, polisïau gwisg ysgol, a bwydlenni cinio.",
        termDates: {
            title: "Dyddiadau'r Tymor",
            body: "Dyddiadau tymor Sir Gâr ar gyfer y flwyddyn ysgol. Mae’r ysgol yn pennu pedwar diwrnod HMS arall, a fydd yn cael eu hychwanegu yma.",
            halfTerm: "Hanner tymor:",
            thisTerm: "Y tymor hwn",
            button: "Lawrlwytho PDF"
        },
        uniform: {
            title: "Gwisg Ysgol",
            daily: "Gwisg bob dydd",
            pe: "Dillad AG",
            button: "Gweld y Polisi Gwisg Ysgol"
        },
        lunchMenu: {
            title: "Bwydlen Ginio",
            parentPay: "Talu am ginio ar ParentPay",
            button: "Lawrlwytho'r Fwydlen Ginio"
        },
        policies: {
            title: "Polisïau Statudol",
            none: "Dim polisïau wedi'u huwchlwytho eto.",
        },
    }
};

// The uniform list as the school wrote it (English only for now)
const DAILY_UNIFORM = [
    { item: 'Jumper/Cardigan:', detail: 'Navy blue with school logo' },
    { item: 'Polo Shirt:', detail: 'White or Sky Blue' },
    { item: 'Trousers/Skirt:', detail: 'Grey or Black' },
    { item: 'Shoes:', detail: 'Black school shoes (no trainers)' },
    { item: 'Summer:', detail: 'Blue Gingham dress or grey shorts' },
];
const PE_KIT = ['White T-shirt (plain)', 'Navy blue or black shorts/joggers', 'Trainers or plimsolls'];

const SECTIONS = ['term-dates', 'uniform', 'lunch-menu', 'policies'];

export default function KeyInfoPage() {
    const { language } = useLanguage();
    const t = content[language];
    const [docs, setDocs] = useState<DocumentWithId[]>([]);
    const [activeSection, setActiveSection] = useState('term-dates');
    const [today, setToday] = useState<string | null>(null);

    const locale = language === 'cy' ? cyLocale : enGB;
    const shortDate = (iso: string) => format(new Date(iso + 'T12:00:00'), 'EEE d MMM', { locale });

    useEffect(() => {
        setToday(format(new Date(), 'yyyy-MM-dd'));
        db.getDocuments().then(setDocs).catch(console.error);

        // The side menu marks the last section whose top has passed the header, and the
        // last section once the page is scrolled to the bottom (it is too short to reach the top)
        const handleScroll = () => {
            let current = SECTIONS[0];
            for (const section of SECTIONS) {
                const element = document.getElementById(section);
                if (element && element.getBoundingClientRect().top <= 160) current = section;
            }
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = SECTIONS[SECTIONS.length - 1];
            setActiveSection(current);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const findDocUrl = (category: string) => docs.find(d => d.category === category)?.fileUrl;
    const policyDocs = docs.filter(d => d.category === 'Policy');

    return (
        <div className="bg-background min-h-screen">
            <PageHeader title={t.title} intro={t.intro} />

            <div className="container mx-auto max-w-7xl px-6 md:px-8 pb-20 pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 relative">

                    {/* Sticky side menu */}
                    <aside className="hidden lg:block lg:col-span-1">
                        <nav className="sticky top-24 space-y-1">
                            {[
                                { id: 'term-dates', label: t.termDates.title, icon: CalendarDays },
                                { id: 'uniform', label: t.uniform.title, icon: Shirt },
                                { id: 'lunch-menu', label: t.lunchMenu.title, icon: Utensils },
                                { id: 'policies', label: t.policies.title, icon: ShieldCheck },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className={cn(
                                            'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors',
                                            activeSection === item.id ? 'bg-rose-50 font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                                        )}
                                    >
                                        <Icon className="h-4 w-4" />
                                        {item.label}
                                    </a>
                                );
                            })}
                        </nav>
                    </aside>

                    <main className="lg:col-span-3 space-y-16 md:space-y-20">

                        {/* Term dates */}
                        <section id="term-dates" className="scroll-m-28">
                            <SectionHeading note={SCHOOL_YEAR[language]}>{t.termDates.title}</SectionHeading>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                {TERMS.map((term) => {
                                    const isNow = !!today && today >= term.starts && today <= term.ends;
                                    return (
                                        <Tile key={term.starts} tone="sky" className={cn(isNow && 'bg-sky-100 ring-2 ring-sky-300')}>
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <TileLabel tone="sky" icon={CalendarDays}>{term.name[language]}</TileLabel>
                                                {isNow && <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">{t.termDates.thisTerm}</span>}
                                            </div>
                                            <p className="mt-3 font-headline text-xl font-semibold leading-snug">
                                                {shortDate(term.starts)} – {shortDate(term.ends)}
                                            </p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                <span className="font-semibold text-foreground/80">{t.termDates.halfTerm}</span> {shortDate(term.halfTerm[0])} – {shortDate(term.halfTerm[1])}
                                            </p>
                                        </Tile>
                                    );
                                })}
                            </div>
                            <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <p className="max-w-xl text-sm text-muted-foreground">{t.termDates.body}</p>
                                <div className="flex flex-wrap items-center gap-3">
                                    <AddToCalendar variant="default" className="shrink-0" />
                                    <a href={findDocUrl('Term Dates') || '#'} download className={pillLink}>
                                        <Download className="h-4 w-4" /> {t.termDates.button}
                                    </a>
                                </div>
                            </div>
                        </section>

                        {/* Uniform */}
                        <section id="uniform" className="scroll-m-28">
                            <SectionHeading>{t.uniform.title}</SectionHeading>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <Tile tone="emerald">
                                    <TileLabel tone="emerald" icon={Shirt}>{t.uniform.daily}</TileLabel>
                                    <ul className="mt-3 space-y-2 text-sm">
                                        {DAILY_UNIFORM.map((row) => (
                                            <li key={row.item}><span className="font-semibold">{row.item}</span> {row.detail}</li>
                                        ))}
                                    </ul>
                                </Tile>
                                <Tile tone="emerald">
                                    <TileLabel tone="emerald" icon={Dumbbell}>{t.uniform.pe}</TileLabel>
                                    <ul className="mt-3 space-y-2 text-sm">
                                        {PE_KIT.map((item) => <li key={item}>{item}</li>)}
                                    </ul>
                                    <p className="mt-4 text-xs text-muted-foreground">PE Kit should be worn to school on PE days.</p>
                                </Tile>
                            </div>
                            <div className="mt-5">
                                <a href={findDocUrl('Uniform') || '#'} download className={pillLink}>
                                    <Download className="h-4 w-4" /> {t.uniform.button}
                                </a>
                            </div>
                        </section>

                        {/* Lunch menu: same look as the homepage's lunch card */}
                        <section id="lunch-menu" className="scroll-m-28">
                            <LunchWeek
                                language={language}
                                actions={
                                    <>
                                        <a href={findDocUrl('Lunch Menu') || '#'} download className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                                            <Download className="h-4 w-4" /> {t.lunchMenu.button}
                                        </a>
                                        <a href={PARENTPAY_URL} target="_blank" rel="noopener noreferrer" className={pillLink}>
                                            {t.lunchMenu.parentPay} <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </>
                                }
                            />
                        </section>

                        {/* Policies */}
                        <section id="policies" className="scroll-m-28">
                            <SectionHeading>{t.policies.title}</SectionHeading>
                            {policyDocs.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {policyDocs.map(link => (
                                        <Tile key={link.id} tone="rose" as="a" hover href={link.fileUrl} target="_blank" rel="noopener noreferrer">
                                            <TileLabel tone="rose" icon={ShieldCheck}>{t.policies.title}</TileLabel>
                                            <p className="mt-3 flex items-start justify-between gap-3 font-headline text-lg font-semibold leading-snug">
                                                {link.title}
                                                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-primary" />
                                            </p>
                                        </Tile>
                                    ))}
                                </div>
                            ) : (
                                <Tile tone="rose">
                                    <p className="text-sm text-muted-foreground">{t.policies.none}</p>
                                </Tile>
                            )}
                        </section>

                    </main>
                </div>
            </div>
        </div>
    );
}
