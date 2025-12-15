'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarDays, ArrowRight, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../LanguageProvider';
import { useNews } from '@/hooks/useNews';

const content = {
    en: {
        title: "News & Announcements",
        subtitle: "Latest updates from Ysgol Maes Y Morfa",
        readMore: "Read full story",
        urgent: "Urgent",
        noNews: "No news at the moment."
    },
    cy: {
        title: "Newyddion a Chyhoeddiadau",
        subtitle: "Diweddariadau diweddaraf o Ysgol Maes Y Morfa",
        readMore: "Darllen stori lawn",
        urgent: "Ar Frys",
        noNews: "Dim newyddion ar hyn o bryd."
    }
}

export default function NewsPage() {
    const { language } = useLanguage();
    const t = content[language];
    const { news: publishedNews } = useNews();

    return (
        <div className="container py-12 space-y-8">
            <div className="text-center space-y-4 max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold font-headline tracking-tight">{t.title}</h1>
                <p className="text-xl text-muted-foreground">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedNews.length > 0 ? (
                    publishedNews.map(post => {
                        const title = language === 'en' ? post.title_en : post.title_cy;
                        const body = language === 'en' ? post.body_en : post.body_cy;

                        return (
                            <Card key={post.id} className="hover:shadow-lg transition-shadow flex flex-col h-full group">

                                <CardHeader>
                                    <div className="flex justify-between items-start gap-4 mb-2">
                                        <Badge variant={post.category === 'Urgent' ? 'destructive' : 'secondary'}>
                                            {post.category === 'Urgent' && <AlertTriangle className="w-3 h-3 mr-1" />}
                                            {post.category}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center shrink-0">
                                            <CalendarDays className="w-3 h-3 mr-1" />
                                            {format(new Date(post.date), 'MMM d, yyyy')}
                                        </span>
                                    </div>
                                    <CardTitle className="line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                                        {title}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow flex flex-col justify-between space-y-4">
                                    <div
                                        className="text-muted-foreground line-clamp-3 text-sm"
                                        dangerouslySetInnerHTML={{ __html: body }}
                                    />
                                    <Button variant="ghost" className="w-full group/btn justify-between hover:bg-primary/5" asChild>
                                        <Link href={`/news/${post.slug}`}>
                                            {t.readMore}
                                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )
                    })
                ) : (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        {t.noNews}
                    </div>
                )}
            </div>
        </div>
    );
}
