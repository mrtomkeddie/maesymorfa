
'use client';

import { useLanguage } from '../../LanguageProvider';
import { ArrowLeft } from "lucide-react";
import Link from 'next/link';
import { PageHeader } from '@/components/public/PageHeader';
import { Tile } from '@/components/public/Tiles';

const content = {
  en: {
    title: "Beyond the Classroom",
    intro: "Learning at Maes Y Morfa extends far beyond the classroom walls. We offer a rich programme of educational visits, residential trips, extra-curricular clubs, and outdoor learning experiences to enrich your child's education. Details coming soon.",
    back: "Back to Curriculum Overview",
  },
  cy: {
    title: "Y Tu Hwnt i'r Ystafell Ddosbarth",
    intro: "Mae dysgu ym Maes Y Morfa yn ymestyn ymhell y tu hwnt i furiau'r ystafell ddosbarth. Rydym yn cynnig rhaglen gyfoethog o ymweliadau addysgol, teithiau preswyl, clybiau allgyrsiol, a phrofiadau dysgu yn yr awyr agored i gyfoethogi addysg eich plentyn. Manylion yn dod yn fuan.",
    back: "Yn ôl i'r Trosolwg Cwricwlwm",
  }
};

export default function BeyondTheClassroomPage() {
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
                <Tile tone="emerald" className="aspect-video items-center justify-center">
                    <p className="text-muted-foreground">Image/Content coming soon</p>
                </Tile>
            </div>
        </div>
    );
}
