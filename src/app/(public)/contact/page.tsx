

'use client';

import { useLanguage } from './../LanguageProvider';
import { PageHeader } from '@/components/public/PageHeader';
import { CardCue, Panel, SectionHeading, Tile, TileLabel, TileTitle, TONES } from '@/components/public/Tiles';
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, Loader2 } from "lucide-react";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { SiteSettings } from '@/lib/types';

const content = {
    en: {
        title: "Contact Us",
        intro: "We’re here to help. Reach out with any questions or to arrange a visit.",
        addressTitle: "School Address",
        phoneTitle: "Phone",
        callUs: "Call the school office",
        emailUs: "Send us an email",
        emailTitle: "Email",
        formTitle: "Send us a Message",
        formName: "Your Name",
        formEmail: "Your Email Address",
        formMessage: "Your Message",
        formSend: "Send Message",
        mapTitle: "Find Us",
        mapPlaceholder: "Interactive map coming soon.",
        toastSuccessTitle: "Message Sent!",
        toastSuccessDesc: "Thank you for getting in touch. We'll get back to you soon.",
        loading: "Loading contact information...",
    },
    cy: {
        title: "Cysylltu â Ni",
        intro: "Rydym yma i helpu. Cysylltwch ag unrhyw gwestiynau neu i drefnu ymweliad.",
        addressTitle: "Cyfeiriad yr Ysgol",
        phoneTitle: "Ffôn",
        callUs: "Ffoniwch swyddfa'r ysgol",
        emailUs: "Anfonwch e-bost atom",
        emailTitle: "E-bost",
        formTitle: "Anfonwch neges atom",
        formName: "Eich Enw",
        formEmail: "Eich Cyfeiriad E-bost",
        formMessage: "Eich Neges",
        formSend: "Anfon Neges",
        mapTitle: "Dod o Hyd i Ni",
        mapPlaceholder: "Map rhyngweithiol yn dod yn fuan.",
        toastSuccessTitle: "Neges wedi'i hanfon!",
        toastSuccessDesc: "Diolch am gysylltu â ni. Byddwn yn ymateb yn fuan.",
        loading: "Wrthi'n llwytho gwybodaeth gyswllt...",
    }
};

const formSchema = (t: typeof content.en) => z.object({
    name: z.string().min(2, { message: "Please enter your name." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});


export default function ContactPage() {
    const { language } = useLanguage();
    const t = content[language];
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            setIsSettingsLoading(true);
            try {
                const siteSettings = await db.getSiteSettings();
                setSettings(siteSettings);
            } catch (error) {
                console.error("Failed to fetch site settings:", error);
                toast({
                    title: "Error",
                    description: "Could not load school information.",
                    variant: "destructive",
                });
            } finally {
                setIsSettingsLoading(false);
            }
        };
        fetchSettings();
    }, [toast]);

    const form = useForm<z.infer<ReturnType<typeof formSchema>>>({
        resolver: zodResolver(formSchema(t)),
        defaultValues: { name: "", email: "", message: "" },
    });

    async function onSubmit(values: z.infer<ReturnType<typeof formSchema>>) {
        setIsLoading(true);
        try {
            await db.addInboxMessage({
                type: 'contact',
                subject: `Contact Form: Inquiry from ${values.name}`,
                body: values.message,
                sender: {
                    name: values.name,
                    email: values.email
                },
                isRead: false,
                createdAt: new Date().toISOString(),
            });

            form.reset();
            toast({
                title: t.toastSuccessTitle,
                description: t.toastSuccessDesc,
            });

        } catch (error) {
            console.error("Failed to submit contact form:", error);
            toast({
                title: "Submission Failed",
                description: "Could not send your message. Please try again later.",
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (isSettingsLoading) {
        return (
            <div className="flex h-96 w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">{t.loading}</p>
            </div>
        )
    }

    const phone = settings?.phone || '';
    const email = settings?.email || '';

    return (
        <div className="bg-background">
            <PageHeader title={t.title} intro={t.intro} />

            <div className="container mx-auto max-w-6xl px-6 pb-20 pt-4 md:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
                    <div className="grid content-start gap-4">
                        <Tile tone="rose" as="a" hover href={`tel:${phone.replace(/\s/g, '')}`}>
                            <TileLabel tone="rose" icon={Phone}>{t.phoneTitle}</TileLabel>
                            <TileTitle className="text-2xl">{phone || 'Phone not available'}</TileTitle>
                            <CardCue label={t.callUs} className={TONES.rose.cue} />
                        </Tile>
                        <Tile tone="sky" as="a" hover href={`mailto:${email}`}>
                            <TileLabel tone="sky" icon={Mail}>{t.emailTitle}</TileLabel>
                            <TileTitle className="break-all">{email || 'Email not available'}</TileTitle>
                            <CardCue label={t.emailUs} className={TONES.sky.cue} />
                        </Tile>
                        <Tile tone="emerald">
                            <TileLabel tone="emerald" icon={MapPin}>{t.addressTitle}</TileLabel>
                            <p className="mt-3 whitespace-pre-line font-medium leading-relaxed">{settings?.address || 'Address not available'}</p>
                        </Tile>
                    </div>

                    <Panel>
                        <h2 className="font-headline text-2xl font-bold md:text-3xl">{t.formTitle}</h2>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.formName}</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.formEmail}</FormLabel>
                                        <FormControl><Input type="email" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="message" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t.formMessage}</FormLabel>
                                        <FormControl><Textarea rows={5} {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <Button type="submit" className="w-full rounded-full" size="lg" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {t.formSend}
                                </Button>
                            </form>
                        </Form>
                    </Panel>
                </div>

                <div className="mt-16">
                    <SectionHeading>{t.mapTitle}</SectionHeading>
                    <div className="aspect-[4/3] w-full overflow-hidden rounded-3xl bg-muted ring-1 ring-black/5 md:aspect-video">
                        <iframe
                            src="https://maps.google.com/maps?q=Ysgol%20Maes%20Y%20Morfa%2C%20Olive%20St%2C%20Llanelli%20SA15%202AP&t=&z=15&ie=UTF8&iwloc=&output=embed"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title={t.mapTitle}
                        ></iframe>
                    </div>
                </div>
            </div>
        </div>
    );
}
