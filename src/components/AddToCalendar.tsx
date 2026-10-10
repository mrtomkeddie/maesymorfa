'use client';

import { useEffect, useState } from 'react';
import { CalendarPlus, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/app/(public)/LanguageProvider';

const FEED_PATH = '/api/calendar';

const content = {
    en: {
        button: 'Add school dates to my phone',
        heading: 'Choose your calendar',
        hint: 'New dates appear on your phone by themselves.',
        apple: 'iPhone, iPad or Mac',
        google: 'Google Calendar (Android)',
        outlook: 'Outlook',
        copy: 'Copy calendar link',
        copied: 'Link copied',
        suggested: 'Your phone',
    },
    cy: {
        button: 'Ychwanegu dyddiadau’r ysgol at fy ffôn',
        heading: 'Dewiswch eich calendr',
        hint: 'Bydd dyddiadau newydd yn ymddangos ar eich ffôn yn awtomatig.',
        apple: 'iPhone, iPad neu Mac',
        google: 'Google Calendar (Android)',
        outlook: 'Outlook',
        copy: 'Copïo dolen y calendr',
        copied: 'Dolen wedi’i chopïo',
        suggested: 'Eich ffôn',
    },
};

type Platform = 'apple' | 'google' | 'other';

// One tap subscribes the phone's calendar to the school feed, so it stays up to date on its own.
export function AddToCalendar({ className, variant = 'outline' }: { className?: string; variant?: 'outline' | 'default' }) {
    const { language } = useLanguage();
    const t = content[language];
    const [host, setHost] = useState('');
    const [platform, setPlatform] = useState<Platform>('other');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setHost(window.location.host);
        const ua = navigator.userAgent;
        if (/iPhone|iPad|iPod|Macintosh/.test(ua)) setPlatform('apple');
        else if (/Android/.test(ua)) setPlatform('google');
    }, []);

    const httpsUrl = `https://${host}${FEED_PATH}`;
    const webcalUrl = `webcal://${host}${FEED_PATH}`;
    const options: { id: Platform | 'outlook'; label: string; href: string }[] = [
        { id: 'apple', label: t.apple, href: webcalUrl },
        { id: 'google', label: t.google, href: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}` },
        { id: 'outlook', label: t.outlook, href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent('Ysgol Maes Y Morfa')}` },
    ];
    // The visitor's own phone first
    options.sort((a, b) => Number(b.id === platform) - Number(a.id === platform));

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(httpsUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            window.prompt(t.copy, httpsUrl);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant={variant} className={`rounded-full ${className ?? ''}`} disabled={!host}>
                    <CalendarPlus className="mr-2 h-4 w-4" /> {t.button}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
                <DropdownMenuLabel className="font-headline text-base">{t.heading}</DropdownMenuLabel>
                <p className="px-2 pb-2 text-xs text-muted-foreground">{t.hint}</p>
                <DropdownMenuSeparator />
                {options.map((o) => (
                    <DropdownMenuItem key={o.id} asChild>
                        <a href={o.href} target={o.id === 'apple' ? undefined : '_blank'} rel="noopener noreferrer" className="flex cursor-pointer items-center justify-between gap-2 py-2.5">
                            <span className="font-medium">{o.label}</span>
                            {o.id === platform && <span className="shrink-0 whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{t.suggested}</span>}
                        </a>
                    </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); copy(); }} className="cursor-pointer py-2.5">
                    {copied ? <Check className="mr-2 h-4 w-4 text-green-600" /> : <Copy className="mr-2 h-4 w-4" />}
                    {copied ? t.copied : t.copy}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
