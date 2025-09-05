
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Reply, Send, Mail } from 'lucide-react';
import { db } from '@/lib/db';
import type { InboxMessageWithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { LanguageToggle } from '../layout';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, formatDistanceToNow } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';

const replyFormSchema = z.object({
  replyMessage: z.string().min(1, 'Reply cannot be empty.'),
});

const content = {
    en: {
        title: 'Inbox',
        description: 'Messages and replies from the school.',
        noMessages: 'Your inbox is empty.',
        noMessagesDesc: "You don't have any messages yet.",
        from: "From:",
        you: "You",
        replyPlaceholder: "Type your reply...",
        sendButton: "Send Reply",
        toastSuccess: "Your reply has been sent.",
        toastError: "Could not send reply.",
    },
    cy: {
        title: 'Mewnflwch',
        description: 'Negeseuon ac atebion gan yr ysgol.',
        noMessages: 'Mae eich mewnflwch yn wag.',
        noMessagesDesc: "Nid oes gennych unrhyw negeseuon eto.",
        from: "Oddi wrth:",
        you: "Chi",
        replyPlaceholder: "Teipiwch eich ateb...",
        sendButton: "Anfon Ateb",
        toastSuccess: "Mae eich ateb wedi'i anfon.",
        toastError: "Ni ellid anfon yr ateb.",
    }
}

const ReplyForm = ({ threadId, subject, onSuccess }: { threadId: string, subject: string, onSuccess: () => void }) => {
    const { language } = useLanguage();
    const t = content[language];
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    const form = useForm<z.infer<typeof replyFormSchema>>({
        resolver: zodResolver(replyFormSchema),
        defaultValues: { replyMessage: '' },
    });

    const handleSendReply = async (values: z.infer<typeof replyFormSchema>) => {
        setIsSending(true);
        try {
            const parentUser = { id: 'parent-1', name: 'Jane Doe', email: 'parent@example.com', type: 'parent' as const };
            await db.addInboxMessage({
                type: 'reply',
                subject: `Re: ${subject}`,
                body: values.replyMessage,
                sender: parentUser,
                recipient: { id: 'admin-1', name: 'School Admin', email: 'admin@example.com', type: 'admin' },
                isRead: false,
                isReadByAdmin: false,
                isReadByParent: true,
                createdAt: new Date().toISOString(),
                threadId: threadId,
            });
            toast({ title: t.toastSuccess });
            form.reset();
            onSuccess(); // Callback to refresh messages
        } catch (error) {
            console.error("Failed to send reply:", error);
            toast({ title: t.toastError, variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSendReply)} className="flex items-start gap-4 pt-4">
                 <FormField
                    control={form.control}
                    name="replyMessage"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Textarea {...field} placeholder={t.replyPlaceholder} rows={1} className="min-h-0" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSending}>
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </Form>
    );
};


export default function ParentInboxPage() {
    const { language } = useLanguage();
    const t = content[language];
    const [threads, setThreads] = useState<Record<string, InboxMessageWithId[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const [activeAccordionItem, setActiveAccordionItem] = useState<string | undefined>(undefined);

    const currentUserId = 'parent-1'; 

    const fetchMessages = async () => {
        setIsLoading(true);
        try {
            const userMessages = await db.getInboxMessagesForUser(currentUserId);
            
            const groupedByThread: Record<string, InboxMessageWithId[]> = {};
            userMessages.forEach(msg => {
                const threadId = msg.threadId || msg.id;
                if (!groupedByThread[threadId]) {
                    groupedByThread[threadId] = [];
                }
                groupedByThread[threadId].push(msg);
            });
            
            for (const threadId in groupedByThread) {
                groupedByThread[threadId].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }

            const sortedThreadIds = Object.keys(groupedByThread).sort((a, b) => {
                const lastMessageA = groupedByThread[a][groupedByThread[a].length - 1];
                const lastMessageB = groupedByThread[b][groupedByThread[b].length - 1];
                return new Date(lastMessageB.createdAt).getTime() - new Date(lastMessageA.createdAt).getTime();
            });
            
            const sortedThreads: Record<string, InboxMessageWithId[]> = {};
            sortedThreadIds.forEach(id => {
                sortedThreads[id] = groupedByThread[id];
            });

            setThreads(sortedThreads);

        } catch (error) {
            console.error("Failed to fetch inbox messages:", error);
            toast({
                title: "Error",
                description: "Could not load your messages.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast]);

    const handleAccordionChange = async (value: string) => {
        setActiveAccordionItem(value);
        const threadMessages = threads[value];
        if (!threadMessages) return;

        for (const message of threadMessages) {
            if (message.recipient.id === currentUserId && !message.isReadByParent) {
                try {
                    await db.updateInboxMessage(message.id, { isReadByParent: true });
                    setThreads(prev => {
                        const newThreads = {...prev};
                        const threadToUpdate = newThreads[value].map(m => 
                            m.id === message.id ? {...m, isReadByParent: true } : m
                        );
                        newThreads[value] = threadToUpdate;
                        return newThreads;
                    });
                } catch (error) {
                    console.error("Failed to mark message as read:", error);
                }
            }
        }
    };
    
    const hasUnread = (thread: InboxMessageWithId[]) => {
        return thread.some(m => m.recipient.id === currentUserId && !m.isReadByParent);
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
                    <p className="text-muted-foreground">{t.description}</p>
                </div>
            </div>

            {Object.keys(threads).length === 0 ? (
                 <Card className="text-center p-12 border-dashed">
                    <Inbox className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">{t.noMessages}</h2>
                    <p className="mt-2 text-muted-foreground">{t.noMessagesDesc}</p>
                </Card>
            ) : (
                 <Accordion 
                    type="single" 
                    collapsible 
                    className="w-full space-y-4"
                    value={activeAccordionItem}
                    onValueChange={handleAccordionChange}
                >
                    {Object.entries(threads).map(([threadId, messages]) => {
                        const firstMessage = messages[0];
                        const lastMessage = messages[messages.length - 1];
                        return (
                            <AccordionItem value={threadId} key={threadId} className="border rounded-lg bg-card overflow-hidden">
                                <AccordionTrigger className={cn("p-4 hover:no-underline", hasUnread(messages) && 'font-bold')}>
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="flex-grow text-left">
                                            <p className="truncate">{firstMessage.subject}</p>
                                            <p className="text-sm text-muted-foreground font-normal">
                                                {messages.length} message{messages.length > 1 ? 's' : ''} - Last update {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                                            </p>
                                        </div>
                                         {hasUnread(messages) && <div className="h-2 w-2 rounded-full bg-primary" />}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/50">
                                    <div className="p-4 space-y-4">
                                        {messages.map(message => (
                                            <div key={message.id} className={cn(
                                                "p-4 rounded-md flex gap-4",
                                                message.sender.type === 'admin' ? "bg-card" : "bg-primary/10"
                                            )}>
                                                <div className="shrink-0 mt-1">
                                                     {message.sender.type === 'admin' ? <Reply className="h-5 w-5 text-primary" /> : <Mail className="h-5 w-5 text-primary" />}
                                                </div>
                                                <div className="flex-grow">
                                                     <div className="flex justify-between items-baseline">
                                                        <p className="font-semibold">
                                                            {message.sender.type === 'admin' ? message.sender.name : t.you}
                                                        </p>
                                                         <p className="text-xs text-muted-foreground">
                                                            {format(new Date(message.createdAt), 'dd MMM yyyy, p')}
                                                        </p>
                                                    </div>
                                                    <p className="mt-2 text-sm whitespace-pre-wrap">{message.body}</p>
                                                </div>
                                            </div>
                                        ))}
                                         <ReplyForm 
                                            threadId={threadId}
                                            subject={firstMessage.subject}
                                            onSuccess={fetchMessages}
                                        />
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        )
                    })}
                </Accordion>
            )}
        </div>
    );
}
