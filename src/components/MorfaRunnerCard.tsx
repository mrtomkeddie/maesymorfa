'use client';

import { useLanguage } from '@/app/(public)/LanguageProvider';
import { Button } from '@/components/ui/button';
import { Play } from 'lucide-react';
import Link from 'next/link';

const content = {
    en: {
        title: 'Play "Morfa Runner"!',
        description: 'Help the Morfa Dragon collect stars and avoid obstacles in our custom-built browser game designed for KS2 pupils to practice reflexes and math skills in a fun environment.',
        cta: 'Play Now'
    },
    cy: {
        title: 'Chwarae "Rhedwr Morfa"!',
        description: 'Helpwch y Ddraig Morfa i gasglu sêr ac osgoi rhwystrau yn ein gêm bwrpasol a ddyluniwyd ar gyfer disgyblion CA2 i ymarfer adweithiau a sgiliau mathemateg mewn amgylchedd hwyliog.',
        cta: 'Chwarae Nawr'
    }
};

export function MorfaRunnerCard() {
    const { language } = useLanguage();
    const t = content[language];

    // Using hardcoded dark styles to match the reference image exactly, ignoring global theme
    return (
        <div className="w-full bg-primary rounded-3xl overflow-hidden p-8 md:p-12 mb-12 shadow-xl  text-white relative">
            <div className="flex flex-col lg:flex-row items-center gap-12">

                {/* Content Side */}
                <div className="flex-1 space-y-6 text-center lg:text-left z-10">
                    <h2 className="text-3xl md:text-5xl font-bold font-headline tracking-tight">
                        {t.title}
                    </h2>
                    <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0">
                        {t.description}
                    </p>
                    <div className="pt-2">
                        <Button
                            asChild
                            className="bg-white text-black hover:bg-gray-200 hover:text-black rounded-full px-8 py-6 text-lg font-semibold transition-transform hover:scale-105"
                        >
                            <Link href="/play">
                                {t.cta} <span className="ml-2">→</span>
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Visual Side (Mockup) */}
                <div className="flex-1 w-full max-w-md lg:max-w-full relative">
                    {/* Decorative blur */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none"></div>

                    {/* Game Screen Mockup */}
                    <div className="relative aspect-video bg-[#020617] rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center group cursor-pointer group">

                        {/* Mock Game Elements */}
                        <div className="absolute bottom-0 w-full h-1/6 bg-[#1e293b]"></div>
                        <div className="absolute bottom-[16%] left-[10%] w-[8%] aspect-square bg-red-800 rounded-sm"></div>
                        <div className="absolute bottom-[16%] right-[15%] w-[6%] h-[15%] bg-yellow-600 rounded-t-sm"></div>

                        {/* Play Overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                <Play className="w-8 h-8 text-white fill-white ml-1" />
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
