import { useState, useMemo } from 'react';
import { news as mockNews, NewsPost } from '@/lib/mockNews';

export function useNews() {
    const [isLoading, setIsLoading] = useState(false); // Mock loading state if needed

    const publishedNews = useMemo(() => {
        return mockNews.filter(n => n.published).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, []);

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
