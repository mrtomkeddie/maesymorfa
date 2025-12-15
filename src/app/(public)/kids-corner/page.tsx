
'use client';

import { useLanguage } from '../LanguageProvider';
import { Gamepad2, Recycle, Languages, MonitorPlay } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';

import { useIsMobile } from '@/hooks/use-mobile';
import { useState, useEffect } from 'react';

const content = {
    en: {
        title: "Kids' Corner",
        intro: "Welcome to the fun zone! Here are some games to test your skills.",
        gameRunner: {
            title: "Morfa Runner",
            howToPlay: "How to Play",
            instructions: "Help our Ysgol Maes Y Morfa student race through the school grounds! Jump over obstacles and collect values for bonus points. The longer you run, the faster it gets!",
            controls: "Press SPACE to jump, and again in mid-air for a double jump!",
            gameElements: "In the game:",
            elements: [
                { name: 'Jump over the Books', image: 'books.png' },
                { name: 'Dodge the School Bag', image: 'bag.png' },
                { name: 'Avoid Mrs Jones!', image: 'teacher.png' },
                { name: 'Collect the School Values for bonus points', image: 'values.png' },
            ]
        },
        gameWelsh: {
            title: "Welsh Word Match",
            howToPlay: "How to Play",
            instructions: "Click on the cards to flip them over. Try to find the matching pairs of English and Welsh words. Test your memory and learn some new words!",
        },
        comingSoon: "Game coming soon!",
        desktopOnly: {
            title: "Games are available on desktop",
            description: "To play our fun games, please visit this page on a desktop or laptop computer."
        }
    },
    cy: {
        title: "Cornel y Plant",
        intro: "Croeso i'r ardal hwyl! Dyma gemau i brofi eich sgiliau.",
        gameRunner: {
            title: "Rhedwr Morfa",
            howToPlay: "Sut i Chwarae",
            instructions: "Helpwch ein myfyriwr o Ysgol Maes Y Morfa i rasio drwy dir yr ysgol! Neidiwch dros rwystrau a chasglu gwerthoedd am bwyntiau bonws. Po hiraf y byddwch chi'n rhedeg, y cyflymaf y bydd hi'n mynd!",
            controls: "Pwyswch SPACE i neidio, ac eto yn yr awyr am naid ddwbl!",
            gameElements: "Yn y gêm:",
            elements: [
                { name: 'Neidio dros y Llyfrau', image: 'books.png' },
                { name: 'Osgowch y Bag Ysgol', image: 'bag.png' },
                { name: 'Osgowch Mrs Jones!', image: 'teacher.png' },
                { name: 'Casglwch Werthoedd yr Ysgol am bwyntiau bonws', image: 'values.png' },
            ]
        },
        gameWelsh: {
            title: "Cymraeg Cyfatebol",
            howToPlay: "Sut i Chwarae",
            instructions: "Cliciwch ar y cardiau i'w troi drosodd. Ceisiwch ddod o hyd i'r parau cyfatebol o eiriau Cymraeg a Saesneg. Profwch eich cof a dysgwch eiriau newydd!",
        },
        comingSoon: "Gêm yn dod yn fuan!",
        desktopOnly: {
            title: "Gemau ar gael ar gyfrifiadur pen desg",
            description: "I chwarae ein gemau hwyliog, ewch i'r dudalen hon ar gyfrifiadur pen desg neu liniadur."
        }
    }
};

export default function KidsCornerPage() {
    const { language } = useLanguage();
    const t = content[language];
    const tRunner = t.gameRunner;
    const tWelsh = t.gameWelsh;
    const isMobile = useIsMobile();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        // Render nothing or a loading spinner on the server to avoid hydration mismatches
        return null;
    }

    return (
        <div className="bg-background">
            <section className="w-full py-16 md:py-24">
                <div className="container mx-auto max-w-4xl px-8 space-y-12">

                    <div className="text-center">
                        <div className="flex justify-center mb-6">
                            <div className="p-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                                <Gamepad2 className="h-12 w-12" />
                            </div>
                        </div>
                        <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-foreground md:text-6xl">
                            {t.title}
                        </h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/80">
                            {t.intro}
                        </p>
                    </div>

                    {isMobile ? (
                        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
                            <MonitorPlay className="h-12 w-12 text-muted-foreground mb-4" />
                            <h2 className="text-xl font-semibold">{t.desktopOnly.title}</h2>
                            <p className="mt-2 text-muted-foreground">{t.desktopOnly.description}</p>
                        </Card>
                    ) : (
                        <>


                            {/* Morfa Runner Game */}
                            <Card className="bg-secondary/30">
                                <CardHeader>
                                    <CardTitle>{tRunner.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-8 mb-6">
                                        <div>
                                            <h3 className="font-bold text-lg mb-2">{tRunner.howToPlay}</h3>
                                            <p className="text-muted-foreground">{tRunner.instructions}</p>
                                            <p className="text-muted-foreground mt-2"><strong>{tRunner.controls}</strong></p>
                                        </div>
                                        <div className="border-t md:border-t-0 md:border-l pl-0 md:pl-8 pt-6 md:pt-0">
                                            <h3 className="font-bold text-lg mb-3">{tRunner.gameElements}</h3>
                                            <div className="space-y-3">
                                                {tRunner.elements.map(item => (
                                                    <div key={item.name} className="flex items-center gap-4">
                                                        <Image src={`/morfa-runner/images/${item.image}`} alt={item.name} width={40} height={40} className="object-contain" />
                                                        <span className="text-muted-foreground font-medium">{item.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="aspect-[900/400] w-full bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                        <iframe
                                            src="/morfa-runner/index.html"
                                            className="w-full h-full border-0"
                                            title="Morfa Runner Game"
                                            allow="fullscreen"
                                        ></iframe>
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                </div>
            </section>
        </div>
    );
}
