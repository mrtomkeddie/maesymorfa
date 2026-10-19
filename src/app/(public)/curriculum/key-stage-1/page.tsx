
'use client';

import { useLanguage } from '../../LanguageProvider';
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';
import { Tile } from '@/components/public/Tiles';

const content = {
    en: {
        title: "Progression Step 2 (Years 1, 2 & 3)",
        intro: "In Progression Step 2, we build upon the foundations of Progression Step 1, developing core skills in reading, writing, and maths through a broad and engaging curriculum. Details coming soon.",
        back: "Back to Curriculum Overview",
    },
    cy: {
        title: "Cam Cynnydd 2 (Blynyddoedd 1, 2 a 3)",
        intro: "Yng Ngham Cynnydd 2, rydym yn adeiladu ar sylfeini Cam Cynnydd 1, gan ddatblygu sgiliau craidd mewn darllen, ysgrifennu, a mathemateg drwy gwricwlwm eang a diddorol. Manylion yn dod yn fuan.",
        back: "Yn ôl i'r Trosolwg Cwricwlwm",
    }
};

export default function KeyStage1Page() {
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

                {/* Placeholder for future content */}
                <Tile tone="sky" className="aspect-video items-center justify-center">
                    <p className="text-muted-foreground">Image/Content coming soon</p>
                </Tile>
            </div>
        </div>
    );
}
