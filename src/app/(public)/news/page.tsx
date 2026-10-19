'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { cy as cyLocale, enGB } from 'date-fns/locale';
import { AlertTriangle, BellRing, CalendarDays } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import { eventDays, safeHtml } from '@/lib/utils';
import { useNews } from '@/hooks/useNews';
import { PageHeader } from '@/components/public/PageHeader';
import { CardCue, Tile, TileLabel, TileTitle, TONES, type Tone } from '@/components/public/Tiles';

const content = {
    en: {
        title: "News & Announcements",
        subtitle: "Latest updates from Ysgol Maes Y Morfa",
        readMore: "Read more",
        when: "When:",
        urgent: "Urgent",
        noNews: "No news at the moment."
    },
    cy: {
        title: "Newyddion a Chyhoeddiadau",
        subtitle: "Diweddariadau diweddaraf o Ysgol Maes Y Morfa",
        readMore: "Darllen mwy",
        when: "Pryd:",
        urgent: "Ar Frys",
        noNews: "Dim newyddion ar hyn o bryd."
    }
}

export default function NewsPage() {
    const { language } = useLanguage();
    const t = content[language];
    const locale = language === 'cy' ? cyLocale : enGB;
    const { news: publishedNews } = useNews();

    return (
        <div className="bg-background">
            <PageHeader title={t.title} intro={t.subtitle} />

            <div className="container mx-auto max-w-7xl px-6 pb-20 pt-4 md:px-8">
                {publishedNews.length > 0 ? (
                    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {publishedNews.map(post => {
                            const title = language === 'en' ? post.title_en : post.title_cy;
                            const body = language === 'en' ? post.body_en : post.body_cy;
                            const urgent = post.isUrgent || post.category === 'Urgent';
                            const isEvent = !!post.eventStart && !isNaN(new Date(post.eventStart).getTime());
                            // Same colours as the homepage: rose for notices, sky for dates, red when urgent
                            const tone: Tone = urgent ? 'red' : isEvent ? 'sky' : 'rose';

                            return (
                                <li key={post.id} className="h-full">
                                    <Tile tone={tone} as={Link} hover href={`/news/${post.slug}`} className="h-full">
                                        <TileLabel tone={tone} icon={urgent ? AlertTriangle : isEvent ? CalendarDays : BellRing}>
                                            {urgent && `${t.urgent} · `}{format(new Date(post.date), 'd MMM yyyy', { locale })}
                                        </TileLabel>
                                        <TileTitle className="line-clamp-3">{title}</TileTitle>
                                        {isEvent && (
                                            <p className={`mt-1 text-sm font-semibold ${TONES.sky.cue}`}>{t.when} {eventDays(post.eventStart!, post.eventEnd, language)}</p>
                                        )}
                                        <div
                                            className="mt-2 line-clamp-3 text-sm text-muted-foreground"
                                            dangerouslySetInnerHTML={{ __html: safeHtml(body) }}
                                        />
                                        <CardCue label={t.readMore} className={TONES[tone].cue} />
                                    </Tile>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <Tile tone="rose" className="items-center py-12 text-center">
                        <p className="text-muted-foreground">{t.noNews}</p>
                    </Tile>
                )}
            </div>
        </div>
    );
}
