
'use client';

import { useLanguage } from '../LanguageProvider';
import { Gamepad2, Recycle, Languages } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import WelshWordMatch from '@/components/games/WelshWordMatch';

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
    gameRecycling: {
        title: "Recycling Sort",
        howToPlay: "How to Play",
        instructions: "Drag and drop the items into the correct recycling bin before they pile up. Be quick and help keep our school tidy!",
    },
    comingSoon: "Game coming soon!"
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
    gameRecycling: {
        title: "Didoli Ailgylchu",
        howToPlay: "Sut i Chwarae",
        instructions: "Llusgwch a gollwng yr eitemau i'r bin ailgylchu cywir cyn iddynt bentyrru. Byddwch yn gyflym a helpwch i gadw ein hysgol yn daclus!",
    },
    comingSoon: "Gêm yn dod yn fuan!"
  }
};

export default function KidsCornerPage() {
    const { language } = useLanguage();
    const t = content[language];
    const tRunner = t.gameRunner;
    const tWelsh = t.gameWelsh;
    const tRecycling = t.gameRecycling;


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

                    {/* Welsh Word Match Game */}
                    <Card className="bg-secondary/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Languages className="h-6 w-6 text-primary" /> {tWelsh.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="mb-6">
                                <h3 className="font-bold text-lg mb-2">{tWelsh.howToPlay}</h3>
                                <p className="text-muted-foreground">{tWelsh.instructions}</p>
                            </div>
                            <WelshWordMatch />
                        </CardContent>
                    </Card>

                    {/* Recycling Sort Game */}
                    <Card className="bg-secondary/30">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3"><Recycle className="h-6 w-6 text-primary" /> {tRecycling.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="mb-6">
                                <h3 className="font-bold text-lg mb-2">{tRecycling.howToPlay}</h3>
                                <p className="text-muted-foreground">{tRecycling.instructions}</p>
                            </div>
                            <div className="aspect-video w-full bg-muted rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground">{t.comingSoon}</p>
                            </div>
                        </CardContent>
                    </Card>

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

                </div>
            </section>
        </div>
    );
}
