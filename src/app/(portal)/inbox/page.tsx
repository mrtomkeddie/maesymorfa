
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Inbox, Reply, Send, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
        description: 'Communication with the school.',
        noMessages: 'No messages yet.',
        noMessagesDesc: "Messages from the school will appear here.",
        replyPlaceholder: "Type your reply...",
        sendButton: "Send",
        toastSuccess: "Reply sent",
        toastError: "Could not send reply.",
    },
    cy: {
        title: 'Mewnflwch',
        description: 'Cyfathrebu â\'r ysgol.',
        noMessages: 'Dim negeseuon eto.',
        noMessagesDesc: "Bydd negeseuon gan yr ysgol yn ymddangos yma.",
        replyPlaceholder: "Teipiwch eich ateb...",
        sendButton: "Anfon",
        toastSuccess: "Anfonwyd yr ateb",
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
            onSuccess();
        } catch (error) {
            console.error("Failed to send reply:", error);
            toast({ title: t.toastError, variant: 'destructive' });
        } finally {
            setIsSending(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSendReply)} className="flex items-end gap-2 mt-4 pt-4 border-t">
                <FormField
                    control={form.control}
                    name="replyMessage"
                    render={({ field }) => (
                        <FormItem className="flex-grow">
                            <FormControl>
                                <Textarea
                                    {...field}
                                    placeholder={t.replyPlaceholder}
                                    className="min-h-[60px] resize-none bg-muted/50 border-0 focus-visible:ring-1"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" size="icon" disabled={isSending} className="mb-0.5 h-10 w-10 shrink-0 rounded-full">
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

        // Mark unread messages as read
        const unreadMessages = threadMessages.filter(m => m.recipient.id === currentUserId && !m.isReadByParent);
        if (unreadMessages.length > 0) {
            for (const message of unreadMessages) {
                try {
                    await db.updateInboxMessage(message.id, { isReadByParent: true });
                } catch (e) { console.error(e) }
            }
            // Optimistic update
            setThreads(prev => {
                const newThreads = { ...prev };
                newThreads[value] = newThreads[value].map(m => ({ ...m, isReadByParent: true }));
                return newThreads;
            });
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
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
                    <p className="text-muted-foreground">{t.description}</p>
                </div>
            </div>

            {Object.keys(threads).length === 0 ? (
                <Card className="text-center p-16 border-dashed">
                    <div className="bg-muted h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-semibold">{t.noMessages}</h2>
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
                        const isUnread = hasUnread(messages);

                        return (
                            <AccordionItem value={threadId} key={threadId} className="border rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                                    <div className="flex items-center gap-4 w-full text-left">
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", isUnread ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div className="flex-grow overflow-hidden">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className={cn("truncate text-base", isUnread ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                                                    {firstMessage.subject}
                                                </h3>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className={cn("truncate text-sm pr-4", isUnread ? "text-foreground" : "text-muted-foreground")}>
                                                {lastMessage.body}
                                            </p>
                                        </div>
                                        {isUnread && <div className="h-2.5 w-2.5 rounded-full bg-primary shrink-0 mr-2 animate-pulse" />}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="bg-muted/30 border-t">
                                    <div className="p-6 space-y-6">
                                        {messages.map((message, index) => {
                                            const isMe = message.sender.type !== 'admin';
                                            return (
                                                <div key={message.id} className={cn("flex gap-3 max-w-[85%]", isMe ? "ml-auto flex-row-reverse" : "")}>
                                                    <Avatar className="h-8 w-8 mt-1 border shadow-sm">
                                                        <AvatarImage src={isMe ? `https://placehold.co/40x40.png?text=Me` : `https://placehold.co/40x40.png?text=S`} />
                                                        <AvatarFallback className={isMe ? "bg-primary text-primary-foreground" : "bg-white"}>
                                                            {isMe ? "Me" : "S"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={cn(
                                                        "p-3.5 rounded-2xl text-sm shadow-sm",
                                                        isMe
                                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                                            : "bg-white dark:bg-card border rounded-tl-none"
                                                    )}>
                                                        <div className="flex justify-between items-baseline gap-4 mb-1 opacity-80 text-xs">
                                                            <span className="font-bold">{isMe ? "You" : message.sender.name}</span>
                                                            <span>{format(new Date(message.createdAt), 'p')}</span>
                                                        </div>
                                                        <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
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
