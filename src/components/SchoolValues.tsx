'use client';

import { Heart, Star, Gem, Lightbulb } from 'lucide-react';
import { useLanguage } from '@/app/(public)/LanguageProvider';

const content = {
    en: {
        heading: "Our Ethos",
        values: [
            { icon: Heart, label: 'Caring', desc: 'Supporting every child' },
            { icon: Star, label: 'Ambitious', desc: 'Striving for excellence' },
            { icon: Gem, label: 'Valued', desc: 'Celebrating diversity' },
            { icon: Lightbulb, label: 'Inspired', desc: 'Igniting curiosity' }
        ]
    },
    cy: {
        heading: "Ein Ethos",
        values: [
            { icon: Heart, label: 'Caring', desc: 'Cefnogi pob plentyn' },
            { icon: Star, label: 'Ambitious', desc: 'Ymdrechu am ragoriaeth' },
            { icon: Gem, label: 'Valued', desc: 'Dathlu amrywiaeth' },
            { icon: Lightbulb, label: 'Inspired', desc: 'Tanio chwilfrydedd' } // Using English keys for simplicity if needed, but labels localized
        ]
    }
};

export function SchoolValues() {
    const { language } = useLanguage();
    const t = content[language];

    return (
        <section className="py-12 mb-12">
            <div className="container mx-auto px-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    {t.values.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div key={i} className="text-center group">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="h-8 w-8 text-primary group-hover:fill-current transition-all" />
                                </div>
                                <h3 className="font-headline text-xl font-bold mb-1">{item.label}</h3>
                                <p className="text-sm text-muted-foreground">{item.desc}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </section>
    );
}
