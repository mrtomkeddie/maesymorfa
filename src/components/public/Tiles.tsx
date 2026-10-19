import type { ElementType, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// The look of the homepage's "Today at school" card, shared by the public pages so the whole
// site reads as one design: soft coloured tiles, a small coloured label with an icon, the title
// in the headline font, and a "this opens something" line at the foot.
// The homepage sets the colours: amber for lunch, sky for dates, rose for notices. Lunch, dates
// and news keep those colours on every page; other pages mix in emerald and violet.
// Class names are written out in full so Tailwind keeps them.
export const TONES = {
    amber: { tile: 'bg-amber-50', hover: 'hover:bg-amber-100', label: 'text-amber-700', cue: 'text-amber-800', ring: 'ring-amber-300', strong: 'bg-amber-100' },
    sky: { tile: 'bg-sky-50', hover: 'hover:bg-sky-100', label: 'text-sky-700', cue: 'text-sky-800', ring: 'ring-sky-300', strong: 'bg-sky-100' },
    rose: { tile: 'bg-rose-50', hover: 'hover:bg-rose-100', label: 'text-primary', cue: 'text-primary', ring: 'ring-rose-300', strong: 'bg-rose-100' },
    red: { tile: 'bg-red-50', hover: 'hover:bg-red-100', label: 'text-red-700', cue: 'text-red-700', ring: 'ring-red-300', strong: 'bg-red-100' },
    emerald: { tile: 'bg-emerald-50', hover: 'hover:bg-emerald-100', label: 'text-emerald-700', cue: 'text-emerald-800', ring: 'ring-emerald-300', strong: 'bg-emerald-100' },
    violet: { tile: 'bg-violet-50', hover: 'hover:bg-violet-100', label: 'text-violet-700', cue: 'text-violet-800', ring: 'ring-violet-300', strong: 'bg-violet-100' },
} as const;
export type Tone = keyof typeof TONES;

// A coloured tile. Pass `as` (a Link or an <a>) and `hover` when the whole tile opens something.
export function Tile({ tone, as: As = 'div', hover = false, className, children, ...props }: {
    tone: Tone;
    as?: ElementType;
    hover?: boolean;
    className?: string;
    children: ReactNode;
    [prop: string]: unknown;
}) {
    const t = TONES[tone];
    return (
        <As className={cn('group flex flex-col rounded-2xl p-5 md:p-6', t.tile, hover && `transition-colors ${t.hover}`, className)} {...props}>
            {children}
        </As>
    );
}

// The small coloured line at the top of a tile: icon, then the label in capitals
export function TileLabel({ tone, icon: Icon, children, className }: { tone: Tone; icon?: ElementType; children: ReactNode; className?: string }) {
    return (
        <p className={cn('flex items-center gap-2 text-xs font-bold uppercase tracking-wider', TONES[tone].label, className)}>
            {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />} {children}
        </p>
    );
}

export function TileTitle({ children, className, as: As = 'p' }: { children: ReactNode; className?: string; as?: ElementType }) {
    return <As className={cn('mt-3 font-headline text-xl font-semibold leading-snug', className)}>{children}</As>;
}

// The "this tile opens something" line at the foot of a tile
export function CardCue({ label, className }: { label: string; className: string }) {
    return (
        <span className={`mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold ${className}`}>
            {label}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
    );
}

// The white panel the homepage's "Today at school" tiles sit in
export function Panel({ className, children, id }: { className?: string; children: ReactNode; id?: string }) {
    return (
        <div id={id} className={cn('rounded-3xl bg-white p-5 shadow-[0_24px_60px_-28px_rgba(30,60,90,0.35)] ring-1 ring-black/5 md:p-8', className)}>
            {children}
        </div>
    );
}

// A section heading in the homepage's style: the heading on the left, a short note on the right
export function SectionHeading({ children, note, as: As = 'h2', className }: { children: ReactNode; note?: ReactNode; as?: ElementType; className?: string }) {
    return (
        <div className={cn('mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1', className)}>
            <As className="font-headline text-2xl font-bold md:text-3xl">{children}</As>
            {note && <p className="text-sm font-medium text-muted-foreground">{note}</p>}
        </div>
    );
}

// Pill links, as under the homepage's "Today at school" tiles
export const pillLink = 'inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary';
