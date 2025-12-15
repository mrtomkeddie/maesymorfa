'use client';

import { Calendar, Shirt, Utensils, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { useLanguage } from '@/app/(public)/LanguageProvider';

const content = {
    en: {
        items: [
            { icon: Calendar, label: 'Term Dates', href: '/key-info#term-dates', desc: 'Check holiday dates' },
            { icon: Shirt, label: 'Uniform', href: '/key-info#uniform', desc: 'School dress code' },
            { icon: Utensils, label: 'Lunch Menu', href: '/key-info#lunch-menu', desc: 'Weekly meals' }
        ]
    },
    cy: {
        items: [
            { icon: Calendar, label: 'Dyddiadau Tymor', href: '/key-info#term-dates', desc: 'Gweld dyddiadau' },
            { icon: Shirt, label: 'Gwisg Ysgol', href: '/key-info#uniform', desc: 'Côd gwisg' },
            { icon: Utensils, label: 'Bwydlen', href: '/key-info#lunch-menu', desc: 'Prydau wythnosol' }
        ]
    }
};

export function QuickLinks() {
    const { language } = useLanguage();
    const t = content[language];

    return (
        <div className="relative -mt-16 z-30 container mx-auto px-8 mb-16">
            <div className="bg-background/80 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
                    {t.items.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={i}
                                href={item.href}
                                className="group flex items-center justify-between p-4 hover:bg-black/5 rounded-xl transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                        <Icon className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">
                                            {item.label}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    );
}
