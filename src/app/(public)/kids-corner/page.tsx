
'use client';

import { useLanguage } from '../LanguageProvider';
import { Gamepad2, MonitorPlay, Star } from 'lucide-react';
import { PageHeader } from '@/components/public/PageHeader';
import { Panel, SectionHeading, Tile, TileLabel } from '@/components/public/Tiles';
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
            <PageHeader
                title={t.title}
                intro={t.intro}
                before={
                    <div className="mb-6 flex justify-center">
                        <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                            <Gamepad2 className="h-10 w-10" />
                        </div>
                    </div>
                }
            />

            <div className="container mx-auto max-w-5xl px-6 pb-20 pt-4 md:px-8">
                {isMobile ? (
                    <Tile tone="violet" className="items-center p-10 text-center">
                        <MonitorPlay className="mb-4 h-12 w-12 text-violet-700" />
                        <h2 className="font-headline text-xl font-semibold">{t.desktopOnly.title}</h2>
                        <p className="mt-2 text-muted-foreground">{t.desktopOnly.description}</p>
                    </Tile>
                ) : (
                    /* Morfa Runner Game */
                    <Panel>
                        <SectionHeading>{tRunner.title}</SectionHeading>
                        <div className="mb-6 grid gap-4 md:grid-cols-2">
                            <Tile tone="violet">
                                <TileLabel tone="violet" icon={Gamepad2}>{tRunner.howToPlay}</TileLabel>
                                <p className="mt-3 text-sm text-muted-foreground">{tRunner.instructions}</p>
                                <p className="mt-3 text-sm font-semibold">{tRunner.controls}</p>
                            </Tile>
                            <Tile tone="amber">
                                <TileLabel tone="amber" icon={Star}>{tRunner.gameElements}</TileLabel>
                                <ul className="mt-3 space-y-2">
                                    {tRunner.elements.map(item => (
                                        <li key={item.name} className="flex items-center gap-3">
                                            <Image src={`/morfa-runner/images/${item.image}`} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                                            <span className="text-sm font-medium">{item.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Tile>
                        </div>
                        <div className="aspect-[900/400] w-full overflow-hidden rounded-2xl bg-muted">
                            <iframe
                                src="/morfa-runner/index.html"
                                className="h-full w-full border-0"
                                title="Morfa Runner Game"
                                allow="fullscreen"
                            ></iframe>
                        </div>
                    </Panel>
                )}
            </div>
        </div>
    );
}
