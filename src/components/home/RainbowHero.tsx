'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Same seven bands as the rainbow on the school's own logo and old homepage.
const BANDS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#3949ab', '#8e24aa'];

const CLOUD_PATH =
    'M30 78c-18 0-26-16-16-28 6-8 16-9 22-6 2-16 18-28 36-24 8-14 32-18 46-4 10-8 30-6 38 8 18-2 32 12 28 28 14 4 16 26-4 26z';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

// One crayon drawing of the school per season, sky cut out so the live sky shows behind it.
// Drawn from the school's own 2012 tour photo; swap in redraws from a current photo when one exists.
const SEASON_IMAGES: Record<Season, string> = {
    spring: '/images/hero/school-spring-v2.webp',
    summer: '/images/hero/school-summer-v2.webp',
    autumn: '/images/hero/school-autumn-v2.webp',
    winter: '/images/hero/school-winter-v2.webp',
};

const SKIES: Record<TimeOfDay, string> = {
    dawn: 'linear-gradient(180deg,#ffc9a8 0%,#ffe3cf 50%,#ffffff 100%)',
    day: 'linear-gradient(180deg,#bfe5fa 0%,#e4f4fd 55%,#ffffff 100%)',
    dusk: 'linear-gradient(180deg,#f59a6b 0%,#f6c1c9 50%,#fbe9ef 80%,#ffffff 100%)',
    // Night fades to white at the bottom too, so it meets the page like the day sky does
    night: 'linear-gradient(180deg,#0e1838 0%,#1c2b5a 50%,#2a3d72 72%,#8a97b8 88%,#ffffff 100%)',
};

// UK seasons by month, and four parts of the day by hour.
function seasonFor(d: Date): Season {
    const m = d.getMonth();
    if (m >= 2 && m <= 4) return 'spring';
    if (m >= 5 && m <= 7) return 'summer';
    if (m >= 8 && m <= 10) return 'autumn';
    return 'winter';
}
function timeFor(d: Date): TimeOfDay {
    const h = d.getHours();
    if (h >= 6 && h < 9) return 'dawn';
    if (h >= 9 && h < 17) return 'day';
    if (h >= 17 && h < 20) return 'dusk';
    return 'night';
}

// Reads the real date and time; ?season=winter&time=night overrides them for previewing.
// ?demo adds a small panel for switching season and time live (for showing the school).
function useSeasonAndTime() {
    const [state, setState] = useState<{ season: Season; time: TimeOfDay } | null>(null);
    const [demo, setDemo] = useState(false);
    useEffect(() => {
        setDemo(new URLSearchParams(window.location.search).has('demo'));
        const now = new Date();
        const q = new URLSearchParams(window.location.search);
        const s = q.get('season') as Season | null;
        const t = q.get('time') as TimeOfDay | null;
        setState({
            season: s && s in SEASON_IMAGES ? s : seasonFor(now),
            time: t && t in SKIES ? t : timeFor(now),
        });
    }, []);
    return { scene: state, setScene: setState, demo };
}

const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
const TIMES: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
// The auto tour: a run through the year, then into the night.
const TOUR: [Season, TimeOfDay][] = [
    ['spring', 'dawn'], ['spring', 'day'], ['summer', 'day'], ['summer', 'dusk'],
    ['autumn', 'day'], ['autumn', 'dusk'], ['winter', 'day'], ['winter', 'night'],
];
const titleCase = (w: string) => w[0].toUpperCase() + w.slice(1);

// Only shown with ?demo. Visitors never see it.
function DemoPanel({ season, time, onChange }: { season: Season; time: TimeOfDay; onChange: (s: Season, t: TimeOfDay) => void }) {
    const [open, setOpen] = useState(true);
    const [touring, setTouring] = useState(false);

    // Starts folded away on phones, so it does not cover the hero
    useEffect(() => {
        if (window.innerWidth < 640) setOpen(false);
    }, []);

    useEffect(() => {
        if (!touring) return;
        let i = Math.max(0, TOUR.findIndex(([s, t]) => s === season && t === time));
        const id = setInterval(() => {
            i = (i + 1) % TOUR.length;
            onChange(...TOUR[i]);
        }, 5000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [touring]);

    const chip = (active: boolean) =>
        `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-white' : 'bg-black/5 text-foreground hover:bg-black/10'}`;

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-4 right-4 z-[60] rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-lg ring-1 ring-black/10"
            >
                Seasons
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-black/10 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
                <p className="font-headline text-lg font-bold">Preview the sky</p>
                <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground" aria-label="Hide panel">
                    Hide
                </button>
            </div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Season</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
                {SEASONS.map((s) => (
                    <button key={s} type="button" className={chip(s === season)} onClick={() => { setTouring(false); onChange(s, time); }}>
                        {titleCase(s)}
                    </button>
                ))}
            </div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Time of day</p>
            <div className="mb-3 flex flex-wrap gap-1.5">
                {TIMES.map((t) => (
                    <button key={t} type="button" className={chip(t === time)} onClick={() => { setTouring(false); onChange(season, t); }}>
                        {titleCase(t)}
                    </button>
                ))}
            </div>
            <button
                type="button"
                onClick={() => setTouring((v) => !v)}
                className={`w-full rounded-full px-3 py-2 text-sm font-semibold transition-colors ${touring ? 'bg-foreground text-background' : 'bg-primary/10 text-primary hover:bg-primary/15'}`}
            >
                {touring ? 'Stop the tour' : 'Play a tour of the year'}
            </button>
        </div>
    );
}

function Cloud({ className, style }: { className: string; style?: React.CSSProperties }) {
    return (
        <svg viewBox="0 0 220 90" className={className} style={style} aria-hidden="true">
            <path d={CLOUD_PATH} fill="#fff" stroke="#9cc7e0" strokeWidth="3" strokeLinejoin="round" filter="url(#crayon-wobble)" />
        </svg>
    );
}

// Fixed positions so every visit looks the same: [left %, fall seconds, delay seconds, size px]
const FALLING: [number, number, number, number][] = [
    [4, 11, -2, 18], [14, 14, -9, 14], [23, 12, -5, 20], [33, 16, -12, 13], [44, 13, -1, 17],
    [53, 15, -7, 15], [62, 12, -10, 19], [71, 17, -4, 14], [80, 13, -8, 18], [90, 15, -3, 15], [97, 12, -11, 13],
];

function Leaf({ color }: { color: string }) {
    return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
            <path d="M12 2c5 4 8 9 5 15-2 3-5 4-5 5 0-1-3-2-5-5C4 11 7 6 12 2z" fill={color} stroke="#7a3d12" strokeWidth="1" filter="url(#crayon-wobble)" />
        </svg>
    );
}
function Petal() {
    return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
            <path d="M12 3c4 3 6 8 3 13-1 2-2 3-3 5-1-2-2-3-3-5C6 11 8 6 12 3z" fill="#f8bbd0" stroke="#ec8fb0" strokeWidth="1" />
        </svg>
    );
}
function Flake() {
    return (
        <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden="true">
            {/* Blue edge under the white, so flakes still show against a pale sky */}
            <g strokeLinecap="round">
                <path d="M12 2v20M3.5 7l17 10M3.5 17l17-10" stroke="#9cc3e6" strokeWidth="4" />
                <path d="M12 2v20M3.5 7l17 10M3.5 17l17-10" stroke="#fff" strokeWidth="2" />
            </g>
        </svg>
    );
}

// Petals in spring, leaves in autumn, snow in winter. Each one restarts above the frame, so the loop never jumps.
function SeasonFall({ season }: { season: Season }) {
    if (season === 'summer') return null;
    const leafColors = ['#e65100', '#f9a825', '#c62828', '#ef6c00'];
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {FALLING.map(([left, dur, delay, size], i) => (
                <span
                    key={i}
                    className="season-fall absolute"
                    style={{
                        left: `${left}%`,
                        width: season === 'autumn' ? size * 1.6 : size,
                        height: season === 'autumn' ? size * 1.6 : size,
                        // Autumn leaves are blown sideways by the wind; petals and snow drift straight down
                        animationName: season === 'autumn' ? 'leaf-blow' : undefined,
                        animationDuration: `${season === 'winter' ? dur * 0.9 : season === 'autumn' ? dur * 0.7 : dur}s`,
                        animationDelay: `${delay}s`,
                        opacity: season === 'winter' ? 0.9 : 0.85,
                    }}
                >
                    {season === 'autumn' && <Leaf color={leafColors[i % leafColors.length]} />}
                    {season === 'spring' && <Petal />}
                    {season === 'winter' && <Flake />}
                </span>
            ))}
        </div>
    );
}

// The sun by day (low and orange at dawn and dusk), the moon and stars at night.
function SkyBody({ time }: { time: TimeOfDay }) {
    if (time === 'night') {
        const stars: [number, number, number][] = [[8, 12, 0], [18, 30, 1.2], [30, 8, 0.6], [46, 20, 1.8], [58, 6, 0.3], [70, 26, 1.1], [84, 10, 2.1], [93, 34, 0.9], [38, 38, 1.5], [64, 44, 0.2]];
        return (
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                {stars.map(([x, y, d], i) => (
                    <span key={i} className="sky-twinkle absolute h-1.5 w-1.5 rounded-full bg-amber-50" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s` }} />
                ))}
                <svg viewBox="0 0 100 100" className="absolute right-[2%] top-[1%] w-11 md:right-[6%] md:top-[10%] md:w-24" aria-hidden="true">
                    <path d="M62 10a40 40 0 1 0 28 62A34 34 0 1 1 62 10z" fill="#fff6d5" stroke="#e8d79a" strokeWidth="2" filter="url(#crayon-wobble)" />
                </svg>
            </div>
        );
    }
    const low = time !== 'day';
    return (
        <div
            className={`pointer-events-none absolute right-[2%] top-[1%] w-12 ${low ? 'md:right-[3%] md:top-[22%] md:w-24' : 'md:right-[5%] md:top-[8%] md:w-28'}`}
            aria-hidden="true"
        >
            <svg viewBox="0 0 120 120" className="sun-spin w-full" aria-hidden="true">
                <g stroke={low ? '#fb8c00' : '#fbc02d'} strokeWidth="6" strokeLinecap="round" filter="url(#crayon-wobble)">
                    {Array.from({ length: 10 }).map((_, i) => {
                        const a = (i / 10) * Math.PI * 2;
                        return <line key={i} x1={60 + Math.cos(a) * 38} y1={60 + Math.sin(a) * 38} x2={60 + Math.cos(a) * 54} y2={60 + Math.sin(a) * 54} />;
                    })}
                </g>
                <circle cx="60" cy="60" r="28" fill={low ? '#ffb74d' : '#ffeb3b'} stroke={low ? '#f57c00' : '#f9a825'} strokeWidth="4" filter="url(#crayon-wobble)" />
            </svg>
        </div>
    );
}

type HeroText = {
    eyebrow: string;
    titleBefore: string;
    titleName: string;
    subtitle: string;
    button: string;
    secondary: string;
    imageAlt: string;
};

// The drawing is cropped to the part that matches the real building; the fade starts right at those edges.
const SCENE_MASK: React.CSSProperties = {
    WebkitMaskImage:
        'linear-gradient(to right, transparent 0%, #000 6.5%, #000 93.6%, transparent 100%), linear-gradient(to bottom, #000 84%, transparent 100%)',
    WebkitMaskComposite: 'source-in',
    maskImage:
        'linear-gradient(to right, transparent 0%, #000 6.5%, #000 93.6%, transparent 100%), linear-gradient(to bottom, #000 84%, transparent 100%)',
    maskComposite: 'intersect',
};

const BUILDING_FILTER: Record<TimeOfDay, string> = {
    dawn: 'sepia(0.18) saturate(1.1) brightness(1.02)',
    day: 'none',
    dusk: 'sepia(0.25) saturate(1.15) brightness(0.95)',
    night: 'brightness(0.6) saturate(0.8) hue-rotate(-8deg)',
};

export function RainbowHero({ t }: { t: HeroText }) {
    const ref = useRef<HTMLElement>(null);
    const reduce = useReducedMotion();
    const { scene, setScene, demo } = useSeasonAndTime();
    const season = scene?.season ?? 'summer';
    const time = scene?.time ?? 'day';
    const night = time === 'night';

    const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
    // Things further away move more slowly as the page scrolls, so the scene gains depth.
    const skyY = useTransform(scrollYProgress, [0, 1], [0, 90]);
    const rainbowY = useTransform(scrollYProgress, [0, 1], [0, 60]);
    const schoolY = useTransform(scrollYProgress, [0, 1], [0, 20]);
    const textY = useTransform(scrollYProgress, [0, 1], [0, 110]);

    return (
        <section
            ref={ref}
            data-season={season}
            data-time={time}
            className="relative flex flex-col lg:block overflow-hidden transition-[background] duration-1000 lg:min-h-[min(88vh,820px)]"
            style={{ background: SKIES[time] }}
        >
            {/* Shared crayon filters: wobble the edges, then rub grain out of the fill */}
            <svg width="0" height="0" className="absolute" aria-hidden="true">
                <defs>
                    <filter id="crayon-wobble">
                        <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="warp" />
                        <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" />
                    </filter>
                    <filter id="crayon" x="-5%" y="-5%" width="110%" height="110%">
                        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="warp" />
                        <feDisplacementMap in="SourceGraphic" in2="warp" scale="7" result="wobbly" />
                        <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="1" seed="9" result="grain" />
                        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.5" result="grainMask" />
                        <feComposite in="wobbly" in2="grainMask" operator="in" />
                    </filter>
                </defs>
            </svg>

            {scene && <SkyBody time={time} />}

            {/* Drifting clouds. Each one leaves the frame before it restarts, so the loop never jumps. */}
            <motion.div
                style={reduce ? undefined : { y: skyY }}
                className={`pointer-events-none absolute inset-x-0 top-0 h-[55%] transition-opacity duration-1000 ${night ? 'opacity-30' : ''}`}
            >
                <Cloud className="hero-cloud absolute top-[8%] w-40 md:w-56 opacity-90" style={{ animationDuration: '70s', animationDelay: '-12s' }} />
                <Cloud className="hero-cloud absolute top-[30%] w-24 md:w-36 opacity-70" style={{ animationDuration: '95s', animationDelay: '-60s' }} />
                <Cloud className="hero-cloud absolute top-[4%] w-28 md:w-40 opacity-80" style={{ animationDuration: '85s', animationDelay: '-38s' }} />
            </motion.div>

            {/* The school scene: rainbow rising from behind the roof, then the drawing. Right-hand side on desktop. */}
            <div
                className="relative mt-4 mx-auto w-[108%] max-w-[560px] lg:absolute lg:top-1/2 lg:-translate-y-1/2 lg:right-[3%] lg:mx-0 lg:mt-0 lg:w-[50%] lg:max-w-[1000px] order-last"
                style={SCENE_MASK}
            >
                <motion.svg
                    viewBox="0 0 1000 560"
                    className={`absolute left-[3%] top-[-2%] w-[94%] [mask-image:linear-gradient(to_bottom,black_50%,transparent_85%)] transition-opacity duration-1000 ${night ? 'opacity-0' : ''}`}
                    style={reduce ? undefined : { y: rainbowY }}
                    aria-hidden="true"
                >
                    <g filter="url(#crayon)">
                        {BANDS.map((color, i) => {
                            const r = 470 - i * 30;
                            return (
                                <motion.path
                                    key={color}
                                    d={`M ${500 - r} 560 A ${r} ${r} 0 0 1 ${500 + r} 560`}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth="30"
                                    strokeLinecap="round"
                                    initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                                    animate={{ pathLength: 1, opacity: 1 }}
                                    transition={{ duration: 1.4, delay: 0.5 + i * 0.09, ease: [0.65, 0, 0.35, 1] }}
                                />
                            );
                        })}
                    </g>
                </motion.svg>

                <motion.div
                    style={reduce ? undefined : { y: schoolY }}
                    initial={reduce ? false : { opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                >
                    {/* Visitors load only this season's drawing; the demo stacks all four so switching crossfades */}
                    {(demo ? SEASONS : [season]).map((s, i) => (
                        <Image
                            key={s}
                            src={SEASON_IMAGES[s]}
                            alt={s === season ? t.imageAlt : ''}
                            aria-hidden={s !== season}
                            width={920}
                            height={675}
                            priority={s === season}
                            sizes="(min-width: 1024px) 50vw, 108vw"
                            className={`h-auto w-full transition-[filter,opacity] duration-1000 ${i === 0 ? 'relative block' : 'absolute inset-0'} ${s === season ? 'opacity-100' : 'opacity-0'}`}
                            style={{ filter: BUILDING_FILTER[time] }}
                        />
                    ))}
                    {/* Warm lit windows after dark */}
                    {night && <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_30%_18%_at_55%_70%,rgba(255,214,120,0.35),transparent_70%)]" aria-hidden="true" />}
                </motion.div>
            </div>

            {scene && <SeasonFall season={season} />}

            {/* Words, on the open sky to the left. On desktop both they and the school are centred on the same middle line. */}
            <div className="relative container mx-auto max-w-7xl px-6 md:px-8 pt-12 md:pt-20 lg:absolute lg:inset-0 lg:flex lg:items-center lg:pt-0">
                <motion.div style={reduce ? undefined : { y: textY }} className="relative z-10 text-center lg:text-left lg:max-w-[34rem]">
                    <p
                        className={`hero-rise font-semibold uppercase tracking-[0.18em] text-xs md:text-sm ${night ? 'text-rose-300' : 'text-primary'}`}
                        style={{ animationDelay: '0.05s' }}
                    >
                        {t.eyebrow}
                    </p>
                    <h1
                        className={`hero-rise mt-4 font-headline font-bold tracking-tight text-4xl sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.02] text-balance transition-colors duration-1000 ${night ? 'text-white' : 'text-foreground'}`}
                        style={{ animationDelay: '0.15s' }}
                    >
                        {t.titleBefore}{' '}
                        <span className="relative inline-block whitespace-nowrap">
                            {t.titleName}
                            <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute left-0 -bottom-2 md:-bottom-3 w-full h-3 md:h-4" aria-hidden="true">
                                <motion.path
                                    d="M4 16 C 60 6, 120 20, 180 10 S 270 8, 296 14"
                                    fill="none"
                                    stroke={night ? '#fda4af' : 'hsl(var(--primary))'}
                                    strokeWidth="7"
                                    strokeLinecap="round"
                                    filter="url(#crayon)"
                                    initial={reduce ? false : { pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.9, delay: 1.5, ease: 'easeInOut' }}
                                />
                            </svg>
                        </span>
                    </h1>
                    <p
                        className={`hero-rise mt-6 max-w-xl mx-auto lg:mx-0 text-lg md:text-xl transition-colors duration-1000 ${night ? 'text-slate-200' : 'text-muted-foreground'}`}
                        style={{ animationDelay: '0.3s' }}
                    >
                        {t.subtitle}
                    </p>
                    <div className="hero-rise mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start" style={{ animationDelay: '0.45s' }}>
                        <Button size="lg" asChild className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/25">
                            <Link href="/about">
                                {t.button} <ArrowRight className="ml-1 h-5 w-5" />
                            </Link>
                        </Button>
                        <Button
                            size="lg"
                            variant="outline"
                            asChild
                            className={`rounded-full px-8 h-12 text-base ${night ? 'bg-white/10 text-white border-white/40 hover:bg-white/20 hover:text-white' : 'bg-white/70'}`}
                        >
                            <Link href="/news">{t.secondary}</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
            {demo && scene && <DemoPanel season={season} time={time} onChange={(s, tm) => setScene({ season: s, time: tm })} />}
        </section>
    );
}
