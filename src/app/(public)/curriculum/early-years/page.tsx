
'use client';

import { useLanguage } from '../../LanguageProvider';
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';

const content = {
    en: {
        title: "Progression Step 1 (Nursery & Reception)",
        intro: "In Progression Step 1, we focus on learning through play, establishing strong foundations in literacy, numeracy, and social skills in a nurturing environment.",
        back: "Back to Curriculum Overview",
    },
    cy: {
        title: "Cam Cynnydd 1 (Meithrin a Derbyn)",
        intro: "Yng Ngham Cynnydd 1, rydym yn canolbwyntio ar ddysgu drwy chwarae, sefydlu sylfeini cryf mewn llythrennedd, rhifedd, a sgiliau cymdeithasol mewn amgylchedd meithringar.",
        back: "Yn ôl i'r Trosolwg Cwricwlwm",
    }
};

export default function EarlyYearsPage() {
    const { language } = useLanguage();
    const t = content[language];

    return (
        <div className="bg-background">
            <PageHeader
                title={t.title}
                before={
                    <Link href="/curriculum" className="mb-6 inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
                    </Link>
                }
            />

            <div className="container mx-auto max-w-4xl px-6 pb-20 pt-4 md:px-8 space-y-8">
                <p className="text-lg text-foreground/90">{t.intro}</p>
            </div>
        </div>
    );
}
