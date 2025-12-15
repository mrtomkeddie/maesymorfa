'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Award, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChildWithId, StaffMemberWithId } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, startOfWeek } from 'date-fns';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { cy, enGB } from 'date-fns/locale';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/config';

const valuesAwardFormSchema = (t: any) => z.object({
    childIds: z.array(z.string()).refine((value) => value.length > 0, {
        message: t.childIds_message,
    }),
    message: z.string().min(10, {
        message: t.message_message,
    }),
});

const content = {
    en: {
        formSchema: {
            childIds_message: "Please select at least one student.",
            message_message: "The message must be at least 10 characters.",
        },
        title: 'Send Values Award',
        description: 'Select multiple students from your class to send a pre-written award notification.',
        backLink: 'Back to Dashboard',
        selectTitle: '1. Select Students',
        weekOf: 'Award for week commencing:',
        messageTitle: '2. Notification Message',
        messageDesc: 'This pre-written message will be sent. The `[STUDENT_NAME]` and `[TEACHER_NAME]` tags will be automatically replaced.',
        submitButton: 'Send Award to {count} Student(s)',
        toast: {
            success: { title: "Success!", description: "A values award notification has been sent to the parents of {count} student(s)." },
            error: { title: "Error", description: "Could not send the notifications. Please try again." }
        }
    },
    cy: {
        formSchema: {
            childIds_message: "Dewiswch o leiaf un myfyriwr.",
            message_message: "Rhaid i'r neges fod o leiaf 10 nod.",
        },
        title: 'Anfon Gwobr Gwerthoedd',
        description: 'Dewiswch nifer o fyfyrwyr o\'ch dosbarth i anfon hysbysiad gwobr wedi\'i ysgrifennu ymlaen llaw.',
        backLink: 'Yn ôl i\'r Dangosfwrdd',
        selectTitle: '1. Dewis Myfyrwyr',
        weekOf: 'Gwobr am yr wythnos yn dechrau:',
        messageTitle: '2. Neges Hysbysu',
        messageDesc: 'Anfonir y neges hon sydd wedi\'i hysgrifennu ymlaen llaw. Bydd y tagiau `[ENW_MYFYRIWR]` a `[ENW_ATHRO]` yn cael eu disodli\'n awtomatig.',
        submitButton: 'Anfon Gwobr i {count} Myfyriwr',
        toast: {
            success: { title: "Llwyddiant!", description: "Mae hysbysiad gwobr gwerthoedd wedi\'i anfon at rieni {count} o fyfyrwyr." },
            error: { title: "Gwall", description: "Ni ellid anfon yr hysbysiadau. Rhowch gynnig arall arni." }
        }
    }
}


export default function ValuesAwardPage() {
    const { language } = useLanguage();
    const t = content[language];
    const router = useRouter();
    const { toast } = useToast();
    const [teacher, setTeacher] = useState<StaffMemberWithId | null>(null);
    const [myClass, setMyClass] = useState<ChildWithId[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPageLoading, setIsPageLoading] = useState(true);
    const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const locale = language === 'cy' ? cy : enGB;

    const defaultMessageTemplate = language === 'cy'
        ? `Annwyl Riant/Gwarcheidwad,\n\nRydym yn falch iawn o'ch hysbysu, am wythnos ${format(weekStart, 'do MMM', { locale })}, bod [ENW_MYFYRIWR] wedi derbyn gwobr gwerthoedd yr ysgol am ddangos caredigrwydd a pharch eithriadol. Rydym yn falch iawn!\n\nDa iawn,\n[ENW_ATHRO]`
        : `Dear Parent/Guardian,\n\nWe are delighted to inform you that for the week of ${format(weekStart, 'do MMM', { locale })}, [STUDENT_NAME] has received a school values award for demonstrating exceptional kindness and respect. We are very proud!\n\nWell done,\n[TEACHER_NAME]`;


    useEffect(() => {
        const fetchTeacherData = async () => {
            setIsPageLoading(true);
            try {
                let userId = 'mock-teacher-id-1';

                if (isFirebaseConfigured) {
                    const auth = getAuth(app);
                    const user = auth.currentUser;
                    if (user) {
                        userId = user.uid;
                    }
                }

                const teacherData = await db.getTeacherAndClass(userId);
                if (teacherData) {
                    setTeacher(teacherData.teacher);
                    setMyClass(teacherData.myClass);
                    form.setValue('message', defaultMessageTemplate.replace(/\[TEACHER_NAME\]|\[ENW_ATHRO\]/g, teacherData.teacher.name));
                }
            } catch (error) {
                console.error("Error fetching teacher data:", error);
                toast({
                    title: "Error",
                    description: "Could not load your class data. Please try again.",
                    variant: "destructive"
                });
            } finally {
                setIsPageLoading(false);
            }
        };
        fetchTeacherData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [toast, isFirebaseConfigured, language]);

    const form = useForm<z.infer<ReturnType<typeof valuesAwardFormSchema>>>({
        resolver: zodResolver(valuesAwardFormSchema(t.formSchema)),
        defaultValues: {
            childIds: [],
            message: defaultMessageTemplate,
        },
    });

    async function onSubmit(values: z.infer<ReturnType<typeof valuesAwardFormSchema>>) {
        setIsLoading(true);

        try {
            const { childIds, message } = values;
            for (const childId of childIds) {
                const child = myClass.find(c => c.id === childId);
                if (!child) continue;

                const personalizedMessage = message.replace(/\[STUDENT_NAME\]|\[ENW_MYFYRIWR\]/g, child.name);

                await db.addParentNotification({
                    childId: child.id,
                    childName: child.name,
                    parentId: 'parent-1',
                    teacherId: teacher?.id || 'teacher-1',
                    teacherName: teacher?.name || 'Teacher',
                    date: new Date().toISOString(),
                    type: 'Values Award',
                    notes: personalizedMessage,
                    isRead: false,
                });
            }

            toast({
                title: t.toast.success.title,
                description: t.toast.success.description.replace('{count}', String(childIds.length)),
            });

            router.push('/teacher/dashboard');

        } catch (error) {
            console.error("Failed to send notifications:", error);
            toast({
                title: "Submission Failed",
                description: t.toast.error.description,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    if (isPageLoading) {
        return <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <Link href="/teacher/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.backLink}
            </Link>
            <div>
                <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
                <p className="text-muted-foreground">{t.description}</p>
            </div>

            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardHeader>
                            <CardTitle>{t.selectTitle}</CardTitle>
                            <CardDescription className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> {t.weekOf} <span className="font-semibold">{format(weekStart, 'EEEE, do MMMM yyyy', { locale })}</span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="childIds"
                                render={() => (
                                    <FormItem>
                                        <ScrollArea className="h-64 rounded-md border">
                                            <div className="p-4">
                                                {myClass.map((item) => (
                                                    <FormField
                                                        key={item.id}
                                                        control={form.control}
                                                        name="childIds"
                                                        render={({ field }) => {
                                                            return (
                                                                <FormItem
                                                                    key={item.id}
                                                                    className="flex flex-row items-center space-x-3 space-y-0 py-2"
                                                                >
                                                                    <FormControl>
                                                                        <Checkbox
                                                                            checked={field.value?.includes(item.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                return checked
                                                                                    ? field.onChange([...(field.value || []), item.id])
                                                                                    : field.onChange(
                                                                                        field.value?.filter(
                                                                                            (value) => value !== item.id
                                                                                        )
                                                                                    )
                                                                            }}
                                                                        />
                                                                    </FormControl>
                                                                    <FormLabel className="font-normal w-full cursor-pointer">
                                                                        {item.name}
                                                                    </FormLabel>
                                                                </FormItem>
                                                            )
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </ScrollArea>
                                        <FormMessage className="mt-2" />
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <CardHeader>
                            <CardTitle>{t.messageTitle}</CardTitle>
                            <CardDescription>{t.messageDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                rows={6}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>

                        <div className="p-6 flex justify-end">
                            <Button type="submit" disabled={isLoading || form.getValues('childIds').length === 0}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <Award className="mr-2 h-4 w-4" />
                                {t.submitButton.replace('{count}', String(form.watch('childIds').length))}
                            </Button>
                        </div>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
