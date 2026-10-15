

'use client';

import { useLanguage } from '@/app/(public)/LanguageProvider';
import { safeHtml } from '@/lib/utils';
import { notFound, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Paperclip, Send, Loader2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { NewsPostWithId } from '@/lib/db/firebase';

const content = {
    en: {
        back: 'Back to all news',
        loadFailed: "This story couldn't be loaded. Check your internet connection and refresh the page.",
        urgent: 'Urgent',
        by: 'Posted on',
        attachment: 'Attachment',
        questionTitle: "Have a question about this?",
        questionDesc: "Your message will be sent privately to the school office.",
        messageLabel: "Your Message",
        sendButton: "Send to Admin",
        toastSuccess: "Your message has been sent.",
        toastError: "Could not send your message. Please try again.",
    },
    cy: {
        back: 'Yn ôl i\'r holl newyddion',
        loadFailed: "Doedd dim modd llwytho'r stori hon. Gwiriwch eich cysylltiad â'r rhyngrwyd ac adnewyddwch y dudalen.",
        urgent: 'Pwysig',
        by: 'Postiwyd ar',
        attachment: 'Atodiad',
        questionTitle: "Oes cwestiwn gennych am hyn?",
        questionDesc: "Anfonir eich neges yn breifat at swyddfa'r ysgol.",
        messageLabel: "Eich Neges",
        sendButton: "Anfon at y Gweinyddwr",
        toastSuccess: "Mae eich neges wedi'i hanfon.",
        toastError: "Methu anfon eich neges. Rhowch gynnig arall arni.",
    }
}

const messageFormSchema = z.object({
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

type MessageFormValues = z.infer<typeof messageFormSchema>;

const ContactAdminSection = ({ articleTitle, t }: { articleTitle: string, t: typeof content['en'] }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isParent, setIsParent] = useState(false);

    useEffect(() => {
        const authStatus = localStorage.getItem('isAuthenticated') === 'true' && localStorage.getItem('userRole') === 'parent';
        setIsParent(authStatus);
    }, []);
    
    const form = useForm<MessageFormValues>({
        resolver: zodResolver(messageFormSchema),
        defaultValues: { message: "" },
    });

    async function onSubmit(values: MessageFormValues) {
        setIsLoading(true);
        const parentInfo = { name: "Jane Doe", email: "parent@example.com" }; // Mocked parent

        try {
            await db.addInboxMessage({
                type: 'contact',
                subject: `Question re: "${articleTitle}"`,
                body: values.message,
                sender: parentInfo,
                isRead: false,
                createdAt: new Date().toISOString(),
            });
            toast({ title: t.toastSuccess });
            form.reset();
        } catch (error) {
            console.error("Failed to send message:", error);
            toast({ title: t.toastError, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }

    if (!isParent) {
        return null; // Don't render anything for non-parents
    }

    return (
        <Card className="mt-12">
            <CardHeader>
                <CardTitle className="flex items-center gap-3"><MessageSquare className="h-6 w-6 text-primary"/> {t.questionTitle}</CardTitle>
                <CardDescription>{t.questionDesc}</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField control={form.control} name="message" render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t.messageLabel}</FormLabel>
                                <FormControl>
                                    <Textarea {...field} rows={4} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <Send className="mr-2 h-4 w-4" /> {t.sendButton}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};


export default function NewsArticlePage() {
    const { language } = useLanguage();
    const t = content[language];
    
    const params = useParams();
    const slug = params.slug as string;
    // undefined while loading, null when there is no published post with this address
    const [post, setPost] = useState<NewsPostWithId | null | undefined>(undefined);
    const [loadFailed, setLoadFailed] = useState(false);

    useEffect(() => {
        // Start fresh for each address, and ignore answers for an address the visitor has left
        let current = true;
        setPost(undefined);
        setLoadFailed(false);
        db.getNewsBySlug(slug).then((found: NewsPostWithId | null) => {
            if (current) setPost(found);
        }).catch((error: unknown) => {
            if (!current) return;
            console.error('Could not load news post:', error);
            setLoadFailed(true);
        });
        return () => { current = false; };
    }, [slug]);

    if (loadFailed) {
        return (
            <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
                <p className="text-lg">{t.loadFailed}</p>
                <Link href="/news" className="underline">{t.back}</Link>
            </div>
        );
    }

    if (post === undefined) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!post) {
        notFound();
    }
    
    const pageTitle = post[`title_${language}`];
    const pageBody = post[`body_${language}`];
    const postDate = new Date(post.date).toLocaleDateString(language === 'cy' ? 'cy-GB' : 'en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });


    return (
        <div className="bg-background">
            <section className="w-full py-16 md:py-24">
                <div className="container mx-auto max-w-4xl px-8">
                    <div className="mb-8">
                         <Link href="/news" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
                         </Link>
                    </div>

                    <article>
                        <header className="mb-8">
                             {post.isUrgent && (
                                <Badge variant="destructive" className="mb-2">
                                    {t.urgent}
                                </Badge>
                            )}
                            <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-foreground md:text-5xl">
                                {pageTitle}
                            </h1>
                            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>{t.by} {postDate}</span>
                            </div>
                        </header>
                        
                        <div 
                            className="prose prose-lg max-w-none dark:prose-invert text-foreground/90" 
                            dangerouslySetInnerHTML={{ __html: safeHtml(pageBody) }}
                        />

                        {post.attachmentUrl && post.attachmentName && (
                            <div className="mt-12 rounded-lg border bg-secondary/30 p-6">
                                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Paperclip className="h-5 w-5" />{t.attachment}</h3>
                                <Button asChild>
                                    <a href={post.attachmentUrl} download={post.attachmentName}>
                                        Download {post.attachmentName}
                                    </a>
                                </Button>
                            </div>
                        )}
                    </article>

                    <ContactAdminSection articleTitle={post.title_en} t={t} />
                </div>
            </section>
        </div>
    )

}
