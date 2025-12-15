

'use client';

import { useLanguage } from './../LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

    return (
        <div className="bg-background">
            <section className="w-full py-16 md:py-24">
                <div className="container mx-auto max-w-6xl px-8">

                    <div className="text-center mb-12">
                        <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-foreground md:text-6xl">
                            {t.title}
                        </h1>
                        <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/80">
                            {t.intro}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        <div className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <MapPin className="h-6 w-6 text-primary" /> {t.addressTitle}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground whitespace-pre-line">{settings?.address || 'Address not available'}</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Phone className="h-6 w-6 text-primary" /> {t.phoneTitle}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <a href={`tel:${settings?.phone}`} className="text-muted-foreground hover:underline">{settings?.phone || 'Phone not available'}</a>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <Mail className="h-6 w-6 text-primary" /> {t.emailTitle}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <a href={`mailto:${settings?.email}`} className="text-muted-foreground hover:underline">{settings?.email || 'Email not available'}</a>
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline text-2xl">{t.formTitle}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Form {...form}>
                                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                            <Button type="submit" className="w-full" disabled={isLoading}>
                                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                {t.formSend}
                                            </Button>
                                        </form>
                                    </Form>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="mt-16">
                        <h2 className="font-headline text-3xl font-extrabold tracking-tighter text-foreground text-center mb-6">
                            {t.mapTitle}
                        </h2>
                        <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden shadow-lg">
                            <iframe
                                src="https://maps.google.com/maps?q=Ysgol%20Maes%20Y%20Morfa%2C%20Olive%20St%2C%20Llanelli%20SA15%202PZ&t=&z=15&ie=UTF8&iwloc=&output=embed"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>

                </div>
            </section>
        </div>
    );
}
