
'use client';

import { useLanguage } from '../../LanguageProvider';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';

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
            <section className="w-full py-16 md:py-24">
                <div className="container mx-auto max-w-4xl px-8 space-y-8">

                    <div className="mb-8">
                        <Link href="/curriculum" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
                        </Link>
                    </div>

                    <div className="text-center">
                        <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-foreground md:text-6xl">
                            {t.title}
                        </h1>
                    </div>

                    <div className="prose prose-lg max-w-none text-foreground/90">
                        <p>{t.intro}</p>
                    </div>

                    {/* Placeholder for future content */}
                    <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground">Image/Content coming soon</p>
                    </div>

                </div>
            </section>
        </div>
    );
}
