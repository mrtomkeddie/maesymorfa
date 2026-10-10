import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/db';
import type { NewsPostWithId } from '@/lib/db/firebase';

// Reads through the data layer, so news added in the admin area shows on the site
export function useNews() {
    const [all, setAll] = useState<NewsPostWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        db.getNews().then(setAll).catch(console.error).finally(() => setIsLoading(false));
    }, []);

    const publishedNews = useMemo(() => {
        return all.filter(n => n.published).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [all]);

    const urgentNews = useMemo(() => {
        return publishedNews.find(n => n.isUrgent);
    }, [publishedNews]);

    const latestNews = useMemo(() => {
        // Get top 3 non-urgent news or just top 3
        return publishedNews.slice(0, 3);
    }, [publishedNews]);

    return {
        news: publishedNews,
        urgentNews,
        latestNews,
        isLoading
    };
}
