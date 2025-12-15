

'use client';

import { useLanguage } from './../LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Calendar, Shirt, Utensils, ShieldCheck, Loader2, UtensilsCrossed, Leaf, IceCream } from "lucide-react";
import { useEffect, useState, Suspense } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { enGB, cy as cyLocale } from 'date-fns/locale';
import { db } from '@/lib/db';
import type { DocumentWithId } from '@/lib/types';

const content = {
    en: {
        title: "Key Information",
        intro: "Find essential information for parents, including term dates, uniform policies, and lunch menus.",
        termDates: {
            title: "Term Dates",
            body: "View the academic calendar for the current school year. Please note INSET days are subject to change.",
            button: "Download Term Dates"
        },
        uniform: {
            title: "School Uniform",
            body: "Our school uniform helps to create a sense of identity and pride. Please ensure your child comes to school in the correct uniform.",
            button: "View Uniform Policy"
        },
        lunchMenu: {
            title: "Lunch Menu",
            body: "We offer a rotating menu of healthy and delicious school lunches, prepared fresh on site.",
            button: "Download Lunch Menu"
        },
        policies: {
            title: "Statutory Policies",
            body: "Access our key statutory policies below.",
            links: [
                { label: "Safeguarding Policy", category: "Policy" },
                { label: "Privacy Policy", category: "Policy" },
                { label: "Complaints Procedure", category: "Policy" }
            ]
        },
        noDocument: "Document not available.",
    },
    cy: {
        title: "Gwybodaeth Allweddol",
        intro: "Dewch o hyd i wybodaeth hanfodol i rieni, gan gynnwys dyddiadau tymor, polisïau gwisg ysgol, a bwydlenni cinio.",
        termDates: {
            title: "Dyddiadau'r Tymor",
            body: "Gweler y calendr academaidd ar gyfer y flwyddyn ysgol gyfredol. Nodwch y gall diwrnodau HMS newid.",
            button: "Lawrlwytho Dyddiadau Tymor"
        },
        uniform: {
            title: "Gwisg Ysgol",
            body: "Mae ein gwisg ysgol yn helpu i greu ymdeimlad o hunaniaeth a balchder. Sicrhewch fod eich plentyn yn dod i'r ysgol yn y wisg gywir.",
            button: "Gweld y Polisi Gwisg Ysgol"
        },
        lunchMenu: {
            title: "Bwydlen Ginio",
            body: "Rydym yn cynnig bwydlen gylchdroi o giniawau ysgol iach a blasus, wedi'u paratoi'n ffres ar y safle.",
            button: "Lawrlwytho'r Fwydlen Ginio"
        },
        policies: {
            title: "Polisïau Statudol",
            body: "Cyrchwch ein polisïau statudol allweddol isod.",
            links: [
                { label: "Polisi Diogelu", category: "Policy" },
                { label: "Polisi Preifatrwydd", category: "Policy" },
                { label: "Gweithdrefn Cwynion", category: "Policy" }
            ]
        },
        noDocument: "Dogfen ddim ar gael.",
    }
};

type InfoCardData = {
    icon: React.ElementType;
    title: string;
    body: string;
    button: string;
    category: "Term Dates" | "Uniform" | "Lunch Menu";
};


export default function KeyInfoPage() {
    const { language } = useLanguage();
    const t = content[language];
    const [docs, setDocs] = useState<DocumentWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('term-dates');

    // Calculate dynamic dates for the current week
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const weekDates = Array.from({ length: 5 }).map((_, i) => addDays(startOfCurrentWeek, i));

    const formatDate = (date: Date, lang: 'en' | 'cy') => {
        const locale = lang === 'en' ? enGB : cyLocale;
        return format(date, 'EEEE do MMM', { locale });
    };



    useEffect(() => {
        db.getDocuments().then((data) => {
            setDocs(data);
            setIsLoading(false);
        }).catch(err => {
            console.error(err);
            setIsLoading(false);
        });

        const handleScroll = () => {
            const sections = ['term-dates', 'uniform', 'lunch-menu', 'policies'];
            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top >= 0 && rect.top <= 300) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const findDocUrl = (category: string) => docs.find(d => d.category === category)?.fileUrl;
    const policyDocs = docs.filter(d => d.category === 'Policy');

    return (
        <div className="bg-background min-h-screen">
            <section className="w-full py-12 md:py-20 bg-secondary/20">
                <div className="container mx-auto px-8 text-center">
                    <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tighter text-foreground mb-4">
                        {t.title}
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-muted-foreground">{t.intro}</p>
                </div>
            </section>

            <div className="container mx-auto max-w-7xl px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 relative">

                    {/* Sticky Sidebar */}
                    <aside className="hidden lg:block lg:col-span-1">
                        <nav className="sticky top-24 space-y-2">
                            {[
                                { id: 'term-dates', label: t.termDates.title, icon: Calendar },
                                { id: 'uniform', label: t.uniform.title, icon: Shirt },
                                { id: 'lunch-menu', label: t.lunchMenu.title, icon: Utensils },
                                { id: 'policies', label: t.policies.title, icon: ShieldCheck },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <a
                                        key={item.id}
                                        href={`#${item.id}`}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${activeSection === item.id ? 'bg-primary text-primary-foreground font-bold shadow-md' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}`}
                                    >
                                        <Icon className="h-5 w-5" />
                                        {item.label}
                                    </a>
                                )
                            })}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-3 space-y-24">

                        {/* Term Dates Section */}
                        <section id="term-dates" className="scroll-m-28">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Calendar className="h-8 w-8" />
                                </div>
                                <h2 className="font-headline text-3xl font-bold">{t.termDates.title}</h2>
                            </div>

                            <Card className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b">
                                        <div className="p-6">
                                            <h3 className="font-bold text-lg mb-4 text-primary">Autumn Term 2024</h3>
                                            <ul className="space-y-2 text-sm">
                                                <li className="flex justify-between"><span>Starts:</span> <span className="font-semibold">2 Sept</span></li>
                                                <li className="flex justify-between"><span>Half Term:</span> <span className="font-semibold">28 Oct - 1 Nov</span></li>
                                                <li className="flex justify-between"><span>Ends:</span> <span className="font-semibold">20 Dec</span></li>
                                            </ul>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="font-bold text-lg mb-4 text-primary">Spring Term 2025</h3>
                                            <ul className="space-y-2 text-sm">
                                                <li className="flex justify-between"><span>Starts:</span> <span className="font-semibold">6 Jan</span></li>
                                                <li className="flex justify-between"><span>Half Term:</span> <span className="font-semibold">24-28 Feb</span></li>
                                                <li className="flex justify-between"><span>Ends:</span> <span className="font-semibold">11 Apr</span></li>
                                            </ul>
                                        </div>
                                        <div className="p-6">
                                            <h3 className="font-bold text-lg mb-4 text-primary">Summer Term 2025</h3>
                                            <ul className="space-y-2 text-sm">
                                                <li className="flex justify-between"><span>Starts:</span> <span className="font-semibold">28 Apr</span></li>
                                                <li className="flex justify-between"><span>Half Term:</span> <span className="font-semibold">26-30 May</span></li>
                                                <li className="flex justify-between"><span>Ends:</span> <span className="font-semibold">21 Jul</span></li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-muted/30 flex items-center justify-between">
                                        <p className="text-sm text-muted-foreground">{t.termDates.body}</p>
                                        <Button variant="outline" size="sm" asChild disabled={!findDocUrl('Term Dates')}>
                                            <a href={findDocUrl('Term Dates') || '#'} download>
                                                <Download className="mr-2 h-4 w-4" /> Download PDF
                                            </a>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        {/* Uniform Section */}
                        <section id="uniform" className="scroll-m-28">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Shirt className="h-8 w-8" />
                                </div>
                                <h2 className="font-headline text-3xl font-bold">{t.uniform.title}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Daily Uniform</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p>• <span className="font-semibold">Jumper/Cardigan:</span> Navy blue with school logo</p>
                                        <p>• <span className="font-semibold">Polo Shirt:</span> White or Sky Blue</p>
                                        <p>• <span className="font-semibold">Trousers/Skirt:</span> Grey or Black</p>
                                        <p>• <span className="font-semibold">Shoes:</span> Black school shoes (no trainers)</p>
                                        <p>• <span className="font-semibold">Summer:</span> Blue Gingham dress or grey shorts</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">PE Kit</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p>• White T-shirt (plain)</p>
                                        <p>• Navy blue or black shorts/joggers</p>
                                        <p>• Trainers or plimsolls</p>
                                        <p className="text-muted-foreground mt-4 text-xs italic">* PE Kit should be worn to school on PE days.</p>
                                    </CardContent>
                                </Card>
                            </div>
                            <div className="mt-6">
                                <Button variant="outline" asChild disabled={!findDocUrl('Uniform')}>
                                    <a href={findDocUrl('Uniform') || '#'} download>
                                        <Download className="mr-2 h-4 w-4" /> {t.uniform.button}
                                    </a>
                                </Button>
                            </div>
                        </section>

                        {/* Lunch Menu Section */}
                        <section id="lunch-menu" className="scroll-m-28">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <Utensils className="h-8 w-8" />
                                </div>
                                <h2 className="font-headline text-3xl font-bold">{t.lunchMenu.title}</h2>
                            </div>

                            <div className="bg-secondary/20 rounded-3xl p-8">
                                <div className="text-center max-w-2xl mx-auto mb-8">
                                    <h3 className="font-headline text-2xl font-bold mb-2">Healthy Meals, Every Day</h3>
                                    <p className="text-muted-foreground">{t.lunchMenu.body}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4 mb-8">









                                    {(language === 'en' ? [
                                        {
                                            day: formatDate(weekDates[0], 'en'),
                                            main: 'Margarita Pizza, Seasoned Cubed Potatoes & Veg',
                                            veg: 'Vegetarian Pizza',
                                            dessert: 'Ice Cream Tub'
                                        },
                                        {
                                            day: formatDate(weekDates[1], 'en'),
                                            main: 'Beef Bolognese, Pasta, Veg & Garlic Bread',
                                            veg: 'Vegetarian Bolognese, Pasta, Veg & Garlic Bread',
                                            dessert: 'Homemade Cookie'
                                        },
                                        {
                                            day: formatDate(weekDates[2], 'en'),
                                            main: 'Traditional Roast Turkey Dinner',
                                            veg: 'Traditional Quorn Fillet Roast Dinner',
                                            dessert: 'Fruit Salad'
                                        },
                                        {
                                            day: formatDate(weekDates[3], 'en'),
                                            main: 'Chicken Fajita Wrap, Mixed Rice & Veg Selection',
                                            veg: 'Jacket Potato, Beans, Cheese, Mixed Rice & Veg',
                                            dessert: 'Yoghurt & Fruit'
                                        },
                                        {
                                            day: formatDate(weekDates[4], 'en'),
                                            main: 'Fish Finger/Fillet, Beans/Veg, Chips/Potatoes',
                                            veg: 'Quorn Dipper, Beans/Veg, Chips/Potatoes',
                                            dessert: 'Shortbread Biscuit'
                                        },
                                    ] : [
                                        {
                                            day: formatDate(weekDates[0], 'cy'),
                                            main: 'Pizza Margarita, Tatws Ciwb a Llysiau',
                                            veg: 'Pizza Llysieuol',
                                            dessert: 'Hufen Iâ'
                                        },
                                        {
                                            day: formatDate(weekDates[1], 'cy'),
                                            main: 'Bolognese Eidion, Pasta, Llysiau a Bara Garlleg',
                                            veg: 'Bolognese Llysieuol, Pasta, Llysiau a Bara Garlleg',
                                            dessert: 'Cwci Cartref'
                                        },
                                        {
                                            day: formatDate(weekDates[2], 'cy'),
                                            main: 'Cinio Twrci Rhost Traddodiadol',
                                            veg: 'Cinio Rhost Quorn Traddodiadol',
                                            dessert: 'Salad Ffrwythau'
                                        },
                                        {
                                            day: formatDate(weekDates[3], 'cy'),
                                            main: 'Fajita Cyw Iâr, Reis Cymysg a Llysiau',
                                            veg: 'Taten Siaced, Ffa, Caws',
                                            dessert: 'Iogwrt a Ffrwythau'
                                        },
                                        {
                                            day: formatDate(weekDates[4], 'cy'),
                                            main: 'Bysedd Pysgod, Ffa/Llysiau, Sglodion',
                                            veg: 'Dipydd Quorn, Ffa/Llysiau, Sglodion',
                                            dessert: 'Bisgedi Byr'
                                        },
                                    ]).map((item, i) => (
                                        <Card key={i} className="border-0 shadow-sm bg-background/50 hover:bg-background transition-colors text-left overflow-hidden">
                                            <div className="flex flex-row items-center justify-between border-b bg-muted/30 px-4 py-2">
                                                <span className="font-bold tracking-widest uppercase text-sm">{item.day}</span>
                                            </div>
                                            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                                        <UtensilsCrossed className="h-4 w-4" />
                                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Main</p>
                                                    </div>
                                                    <p className="text-sm font-medium leading-normal">{item.main}</p>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2 text-green-600">
                                                        <Leaf className="h-4 w-4" />
                                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Vegetarian</p>
                                                    </div>
                                                    <p className="text-sm font-medium leading-normal">{item.veg}</p>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2 text-pink-500">
                                                        <IceCream className="h-4 w-4" />
                                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dessert</p>
                                                    </div>
                                                    <p className="text-sm font-medium leading-normal">{item.dessert}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="text-center">
                                    <Button asChild size="lg" className="rounded-full shadow-md hover:shadow-xl transition-all" disabled={!findDocUrl('Lunch Menu')}>
                                        <a href={findDocUrl('Lunch Menu') || '#'} download>
                                            <Download className="mr-2 h-4 w-4" /> {t.lunchMenu.button}
                                        </a>
                                    </Button>
                                </div>
                            </div>
                        </section>

                        {/* Policies Section */}
                        <section id="policies" className="scroll-m-28">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                    <ShieldCheck className="h-8 w-8" />
                                </div>
                                <h2 className="font-headline text-3xl font-bold">{t.policies.title}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {policyDocs.length > 0 ? policyDocs.map(link => (
                                    <a
                                        key={link.id}
                                        href={link.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center p-4 bg-background border rounded-xl hover:border-primary hover:shadow-md transition-all group"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mr-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                            <ExternalLink className="h-5 w-5" />
                                        </div>
                                        <span className="font-medium group-hover:text-primary transition-colors">{link.title}</span>
                                    </a>
                                )) : (
                                    <div className="col-span-full text-center py-8 text-muted-foreground border-2 border-dashed rounded-xl">
                                        No policies currently uploaded.
                                    </div>
                                )}
                            </div>
                        </section>

                    </main>
                </div>
            </div>
        </div>
    );
}
