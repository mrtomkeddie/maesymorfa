
'use client';

import { useLanguage } from '../../LanguageProvider';
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';
import { Tile } from '@/components/public/Tiles';

const content = {
    en: {
        title: "Progression Step 3 (Years 4, 5 & 6)",
        intro: "In Progression Step 3, we foster greater independence and deeper subject knowledge, preparing pupils for a smooth transition to secondary school. Our curriculum is challenging, engaging, and designed to inspire a lifelong love of learning. Details coming soon.",
        back: "Back to Curriculum Overview",
    },
    cy: {
        title: "Cam Cynnydd 3 (Blynyddoedd 4, 5 a 6)",
        intro: "Yng Ngham Cynnydd 3, rydym yn meithrin mwy o annibyniaeth a gwybodaeth pwnc ddyfnach, gan baratoi disgyblion ar gyfer trosglwyddiad llyfn i'r ysgol uwchradd. Mae ein cwricwlwm yn heriol, yn ddiddorol, ac wedi'i gynllunio i ysbrydoli cariad at ddysgu am oes. Manylion yn dod yn fuan.",
        back: "Yn ôl i'r Trosolwg Cwricwlwm",
    }
};

export default function KeyStage2Page() {
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
                <Tile tone="violet" className="aspect-video items-center justify-center">
                    <p className="text-muted-foreground">Image/Content coming soon</p>
                </Tile>
            </div>
        </div>
    );
}
