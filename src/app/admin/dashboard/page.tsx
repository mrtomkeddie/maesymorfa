
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Newspaper, Calendar, Users, FileText, Settings, BookUser, Users2, ArrowRight, Lightbulb, TrendingUp, Loader2, Megaphone } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from 'framer-motion';
import { db } from "@/lib/db";
import { useLanguage } from "@/app/(public)/LanguageProvider";
import { FEATURES } from "@/lib/config/features";

const content = {
    en: {
        welcome: "Welcome Back!",
        description: "This is your content management system. Select a topic below for a quick guide.",
        stats: {
            pupils: "Total Pupils",
            parents: "Parent Accounts",
            documents: "Documents",
        },
        howTo: {
            title: "How to Use This Dashboard",
            description: "Click a topic below to see a step-by-step guide. For full management, use the navigation menu on the left.",
        },
        guide: {
            titleSuffix: "Guide",
            instructions: "Instructions",
            tipTitle: "Good to know",
            goTo: "Go to {topic} page",
        },
        topics: [
            {
                id: 'announcement', title: 'Announcements', icon: Megaphone, href: '/admin/announcements',
                instructions: [
                    "Go to the 'Announcements' page from the sidebar.",
                    "Click the 'Add Announcement' button.",
                    "Title: Give it a clear name (e.g., 'School Disco').",
                    "Event: Pick a date to add it to the Calendar page.",
                    "News: Add text in the Body to create a News Post.",
                    "Both: Fill in date AND body to make it appear on both pages.",
                    "Urgent: Checking 'Urgent' will also show a red banner on the Home page."
                ],
                tip: "Think of this as your one-stop shop. One form can create a calendar event, a news story, or an urgent alert."
            },
            {
                id: 'staff', title: 'Staff Directory', icon: Users, href: '/admin/staff',
                instructions: [
                    "Go to the 'Staff' page.",
                    "Click 'Add Staff Member'.",
                    "Details: Name, Role (e.g., Year 2 Teacher), and Tag/Team.",
                    "Photo: Upload a square photo if possible for best look.",
                    "Site: Saving here immediately updates the 'About Us' > 'Staff' page."
                ],
                tip: "Use naming consistent with what you want parents to see. The 'Team' you select groups them on the public page."
            },
            {
                id: 'documents', title: 'Documents', icon: FileText, href: '/admin/documents',
                instructions: [
                    "Go to the 'Documents' page.",
                    "Click 'Upload Document'.",
                    "Category is Key: The category you choose determines WHERE it appears on the site.",
                    "Term Dates -> Updates the 'Download Term Dates' button in Key Info.",
                    "Lunch Menu -> Updates the 'Download Lunch Menu' button in Key Info.",
                    "Policy -> Adds it to the list of policies in Key Info."
                ],
                tip: "You don't need to delete old lunch menus manually if you replace them, but keeping the folder tidy is good practice. The site always looks for the most recent file for menus and dates."
            },
            {
                id: 'settings', title: 'Site Settings', icon: Settings, href: '/admin/settings',
                instructions: [
                    "Go to the 'System' > 'Site Settings' page.",
                    "Update Contact Info: Changing phone/email here updates the Footer and Contact page.",
                    "Socials: Add your Facebook/Twitter links here to show icons in the Footer.",
                    "Save: Changes are live immediately."
                ],
                tip: "Double-check phone numbers and emails to avoid parents contacting the wrong place."
            },
        ]
    },
    cy: {
        welcome: "Croeso'n ôl!",
        description: "Dyma eich system rheoli cynnwys. Dewiswch bwnc isod am ganllaw cyflym.",
        stats: {
            pupils: "Cyfanswm Disgyblion",
            parents: "Cyfrifon Rhieni",
            documents: "Dogfennau",
        },
        howTo: {
            title: "Sut i Ddefnyddio'r Dangosfwrdd Hwn",
            description: "Cliciwch bwnc isod i weld canllaw cam wrth gam. Ar gyfer rheolaeth lawn, defnyddiwch y ddewislen ar y chwith.",
        },
        guide: {
            titleSuffix: " Canllaw",
            instructions: "Cyfarwyddiadau",
            tipTitle: "Da gwybod",
            goTo: "Ewch i dudalen {topic}",
        },
        topics: [
            {
                id: 'announcement', title: 'Cyhoeddiadau', icon: Megaphone, href: '/admin/announcements',
                instructions: [
                    "Ewch i 'Cyhoeddiadau'.",
                    "Cliciwch 'Ychwanegu Cyhoeddiad'.",
                    "Teitl: Rhowch enw clir.",
                    "Digwyddiad: Dewiswch ddyddiad i'w ychwanegu at y Calendr.",
                    "Newyddion: Ychwanegwch destun i greu Post Newyddion.",
                    "Y Ddau: Llenwch ddyddiad A thestun i ymddangos ar y ddwy dudalen.",
                    "Brys: Bydd ticio 'Brys' yn dangos baner goch ar y Hafan."
                ],
                tip: "Un ffurflen sy'n gwneud popeth. Gallwch greu digwyddiad, stori newyddion, neu rybudd brys fan hyn."
            },
            {
                id: 'staff', title: 'Cyfeirlyfr Staff', icon: Users, href: '/admin/staff',
                instructions: [
                    "Ewch i 'Staff'.",
                    "Cliciwch 'Ychwanegu Aelod o Staff'.",
                    "Manylion: Enw, Rôl, a Thîm.",
                    "Llun: Llwythwch lun sgwâr i fyny os yn bosibl.",
                    "Gwefan: Mae cadw yma yn diweddaru'r dudalen 'Amdanom Ni' yn syth."
                ],
                tip: "Defnyddiwch enwau rydych chi am i rieni eu gweld."
            },
            {
                id: 'documents', title: 'Dogfennau', icon: FileText, href: '/admin/documents',
                instructions: [
                    "Ewch i 'Dogfennau'.",
                    "Cliciwch 'Llwytho Dogfen i Fyny'.",
                    "Mae Categori yn Allweddol: Mae'r categori yn penderfynu LLE mae'n ymddangos.",
                    "Dyddiadau Tymor -> Diweddaru botwm yn Gwybodaeth Allweddol.",
                    "Bwydlen Ginio -> Diweddaru botwm yn Gwybodaeth Allweddol.",
                    "Polisi -> Ychwanegu at y rhestr polisïau."
                ],
                tip: "Mae'r wefan bob amser yn chwilio am y ffeil ddiweddaraf ar gyfer bwydlenni a dyddiadau."
            },
            {
                id: 'settings', title: 'Gosodiadau Gwefan', icon: Settings, href: '/admin/settings',
                instructions: [
                    "Ewch i 'Gosodiadau Gwefan'.",
                    "Diweddarwch fanylion cyswllt i newid y Troedyn a'r dudalen Cysylltu.",
                    "Cymdeithasol: Ychwanegwch ddolenni Facebook/Twitter yma.",
                    "Cadw: Mae newidiadau yn fyw ar unwaith."
                ],
                tip: "Gwiriwch rifau ffôn ac e-byst yn ofalus."
            },
        ]
    }
}


type Stat = {
    label: string;
    value: number | null;
    icon: React.ElementType;
}

export default function AdminDashboardPage() {
    const { language } = useLanguage();
    const t = content[language];
    const managementTopics = t.topics.filter(topic => {
        if (!FEATURES.enableParentPortal && (topic.id === 'parents' || topic.id === 'children')) return false;
        return true;
    });

    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [stats, setStats] = useState<{ label: string, value: number | null, icon: React.ElementType }[]>(
        FEATURES.enableParentPortal ? [
            { label: t.stats.pupils, value: null, icon: BookUser },
            { label: t.stats.parents, value: null, icon: Users2 },
            { label: t.stats.documents, value: null, icon: FileText },
        ] : [
            { label: 'News Posts', value: null, icon: Newspaper },
            { label: 'Upcoming Events', value: null, icon: Calendar },
            { label: t.stats.documents, value: null, icon: FileText },
        ]
    );

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const promises = [
                    db.getCollectionCount('documents'),
                ];

                if (FEATURES.enableParentPortal) {
                    promises.push(db.getCollectionCount('children'));
                    promises.push(db.getCollectionCount('parents'));
                } else {
                    promises.push(db.getCollectionCount('news'));
                    promises.push(db.getCollectionCount('events'));
                }

                const results = await Promise.all(promises);
                const documentCount = results[0];

                if (FEATURES.enableParentPortal) {
                    setStats([
                        { label: t.stats.pupils, value: results[1], icon: BookUser },
                        { label: t.stats.parents, value: results[2], icon: Users2 },
                        { label: t.stats.documents, value: documentCount, icon: FileText },
                    ]);
                } else {
                    // MVP View: Focus on content
                    setStats([
                        { label: 'News Posts', value: results[1], icon: Newspaper }, // Fallback labels in English for now, ideally added to translation object
                        { label: 'Upcoming Events', value: results[2], icon: Calendar },
                        { label: t.stats.documents, value: documentCount, icon: FileText },
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch collection counts:", error);
                // Keep values as null to show loading state or error
            }
        };

        fetchStats();
    }, [t.stats.pupils, t.stats.parents, t.stats.documents]);

    const activeTopic = managementTopics.find(t => t.id === selectedTopic);

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">{t.welcome}</h1>
                <p className="text-muted-foreground">{t.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map(stat => {
                    const Icon = stat.icon;
                    return (
                        <Card key={stat.label}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                                <Icon className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {stat.value === null ? (
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                ) : (
                                    <div className="text-2xl font-bold">{stat.value}</div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>


            <Card>
                <CardHeader>
                    <CardTitle>{t.howTo.title}</CardTitle>
                    <CardDescription>
                        {t.howTo.description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {managementTopics.map((topic) => {
                            const Icon = topic.icon;
                            return (
                                <Button
                                    key={topic.id}
                                    variant={selectedTopic === topic.id ? "secondary" : "outline"}
                                    onClick={() => setSelectedTopic(selectedTopic === topic.id ? null : topic.id)}
                                    className="p-4 h-auto flex flex-col items-start justify-start text-left"
                                >
                                    <Icon className="h-6 w-6 mb-2 text-primary" />
                                    <span className="font-semibold">{topic.title}</span>
                                </Button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            <AnimatePresence>
                {activeTopic && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className="bg-secondary/30">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <activeTopic.icon className="h-5 w-5 text-primary" />
                                    {activeTopic.title} {t.guide.titleSuffix}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">{t.guide.instructions}</h3>
                                    <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                        {activeTopic.instructions.map((step, index) => (
                                            <li key={index}>{step}</li>
                                        ))}
                                    </ol>
                                </div>
                                {activeTopic.tip && (
                                    <div className="p-3 rounded-md bg-background/50 border border-primary/20">
                                        <div className="flex items-start gap-3">
                                            <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                                            <div>
                                                <h4 className="font-semibold text-primary">{t.guide.tipTitle}</h4>
                                                <p className="text-sm text-muted-foreground">{activeTopic.tip}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div className="pt-2">
                                    <Button asChild variant="link" className="p-0">
                                        <Link href={activeTopic.href}>
                                            {t.guide.goTo.replace('{topic}', activeTopic.title)} <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
