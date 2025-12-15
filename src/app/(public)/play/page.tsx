'use client';

import { useLanguage } from '@/app/(public)/LanguageProvider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import Link from 'next/link';
import { useState, useRef } from 'react';

const content = {
    en: {
        back: "Exit Game",
        fullscreen: "Toggle Fullscreen"
    },
    cy: {
        back: "Gadael Gêm",
        fullscreen: "Sgrin Lawn"
    }
};

export default function PlayPage() {
    const { language } = useLanguage();
    const t = content[language];
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    return (
        <div ref={containerRef} className="fixed inset-0 w-screen h-[100dvh] bg-black z-50 overflow-hidden flex flex-col">

            {/* Toolbar - Floating on top */}
            <div className="absolute top-4 left-4 z-10 flex gap-2">
                <Button asChild variant="secondary" size="sm" className="opacity-80 hover:opacity-100 shadow-lg backdrop-blur-sm">
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {t.back}
                    </Link>
                </Button>
            </div>

            <div className="absolute top-4 right-4 z-10">
                <Button
                    variant="secondary"
                    size="icon"
                    onClick={toggleFullscreen}
                    className="opacity-80 hover:opacity-100 shadow-lg backdrop-blur-sm"
                    title={t.fullscreen}
                >
                    {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </Button>
            </div>

            {/* Game Iframe */}
            <iframe
                src="/morfa-runner/index.html"
                className="w-full h-full border-0 select-none"
                title="Morfa Runner"
                allow="fullscreen; autoplay"
                loading="eager"
            />
        </div>
    );
}
