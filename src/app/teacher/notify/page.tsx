'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, Send, History, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/config';

const formSchema = (t: any) => z.object({
  type: z.enum(["Achievement", "Incident", "General"], {
    required_error: t.required,
  }),
  notes: z.string().min(1, {
    message: t.required,
  }),
  treatmentGiven: z.string().optional(),
});

const content = {
  en: {
    title: 'Notify Parent',
    description: 'Send a quick message to {childName}\'s parents.',
    backLink: 'Back to Dashboard',
    noChild: 'No child selected.',
    goBack: 'Go Back',
    formSchema: {
      required: 'Required'
    },
    form: {
      title: 'Message Details',
      description: 'Choose a type and write your message.',
      typeLabel: 'Message Type',
      typePlaceholder: 'Select a type',
      typeAchievement: 'Achievement',
      typeIncident: 'Incident',
      typeGeneral: 'General Message',
      notesLabel: 'Message',
      notesPlaceholder: 'Enter your message here...',
      treatmentLabel: 'Treatment Given (if applicable)',
      treatmentPlaceholder: 'e.g. Ice pack applied',
      submitButton: 'Send Notification'
    },
    chatInterface: {
      title: 'Message to {parentName}',
      subtitle: 'Regarding: {childName}',
      placeholder: 'Type your message here...',
      send: 'Send Message',
      quick: 'Quick Replies',
      history: 'Message History'
    },
    toast: {
      success: 'Message sent to {childName}\'s parents.',
      error: 'Failed to send message.',
      noChildError: 'No child selected.'
    }
  },
  cy: {
    title: 'Hysbysu Rhiant',
    description: 'Anfon neges gyflym at rieni {childName}.',
    backLink: 'Yn ôl i\'r Dangosfwrdd',
    noChild: 'Dim plentyn wedi\'i ddewis.',
    goBack: 'Yn ôl',
    formSchema: {
      required: 'Angenrheidiol'
    },
    form: {
      title: 'Manylion Neges',
      description: 'Dewiswch fath ac ysgrifennwch eich neges.',
      typeLabel: 'Math o Neges',
      typePlaceholder: 'Dewiswch fath',
      typeAchievement: 'Cyflawniad',
      typeIncident: 'Digwyddiad',
      typeGeneral: 'Neges Gyffredinol',
      notesLabel: 'Neges',
      notesPlaceholder: 'Rhowch eich neges yma...',
      treatmentLabel: 'Triniaeth a Roddwyd (os yn berthnasol)',
      treatmentPlaceholder: 'e.e. Pecyn iâ wedi\'i gymhwyso',
      submitButton: 'Anfon Hysbysiad'
    },
    chatInterface: {
      title: 'Neges at {parentName}',
      subtitle: 'Ynghylch: {childName}',
      placeholder: 'Teipiwch eich neges yma...',
      send: 'Anfon Neges',
      quick: 'Atebion Cyflym',
      history: 'Hanes Negeseuon'
    },
    toast: {
      success: 'Anfonwyd neges at rieni {childName}.',
      error: 'Methwyd anfon neges.',
      noChildError: 'Dim plentyn wedi\'i ddewis.'
    }
  }
};

function NotifyPageContent() {
  const { language } = useLanguage();
  const t = content[language];
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [teacher, setTeacher] = useState<any>(null); // simplified type
  const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;


  const childId = searchParams.get('childId');
  const childName = searchParams.get('childName');

  useEffect(() => {
    const fetchTeacher = async () => {
      let userId = 'mock-teacher-id-1';

      if (isFirebaseConfigured) {
        const auth = getAuth(app);
        const user = auth.currentUser;
        if (user) {
          userId = user.uid;
        }
      }

      const teacherData = await db.getTeacherAndClass(userId);
      if (teacherData) setTeacher(teacherData.teacher);
    }
    fetchTeacher();
  }, [isFirebaseConfigured]);

  const form = useForm<z.infer<ReturnType<typeof formSchema>>>({
    resolver: zodResolver(formSchema(t.formSchema)),
    defaultValues: {
      notes: "",
      treatmentGiven: "",
      type: "General"
    },
  });

  const notificationType = form.watch('type');

  async function onSubmit(values: z.infer<ReturnType<typeof formSchema>>) {
    if (!childId || !childName) {
      toast({ title: "Error", description: t.toast.noChildError, variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const parentId = 'parent-1';

      await db.addParentNotification({
        childId,
        childName,
        parentId,
        teacherId: teacher?.id || 'teacher-1',
        teacherName: teacher?.name || 'Teacher',
        date: new Date().toISOString(),
        type: values.type,
        notes: values.notes,
        treatmentGiven: values.treatmentGiven,
        isRead: false,
      });

      toast({
        title: "Notification Sent",
        description: t.toast.success.replace('{childName}', childName),
      });

      router.push('/teacher/outbox');

    } catch (error) {
      console.error("Failed to send notification:", error);
      toast({
        title: "Submission Failed",
        description: t.toast.error,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!childName) {
    return (
      <div className="text-center">
        <p>{t.noChild}</p>
        <Button asChild variant="link"><Link href="/teacher/dashboard">{t.goBack}</Link></Button>
      </div>
    )
  }

  const quickReplies = ["Great work today!", "Please restart reading book.", "Excellent behaviour award!", "Reminder: PE Kit tomorrow."];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/teacher/dashboard" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.backLink || 'Back to Dashboard'}
          </Link>
          <h1 className="text-3xl font-bold font-headline">{t.chatInterface.title.replace('{parentName}', 'Parent')}</h1>
          <p className="text-muted-foreground text-lg">{t.chatInterface.subtitle.replace('{childName}', childName)}</p>
        </div>
        <Avatar className="h-16 w-16 border-2 border-primary/10">
          <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
            {childName.charAt(0)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Left Column: Composition (2 cols wide on large screens) */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          <Card className="flex-1 flex flex-col shadow-md border-primary/10">
            <CardHeader className="pb-3 border-b bg-muted/20">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                {t.form.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4 gap-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col gap-4">

                  {/* Hidden Type Field - default to General unless changed */}
                  <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
                    {['General', 'Achievement', 'Incident'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => form.setValue('type', type as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${notificationType === type ? 'bg-background shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Textarea
                            placeholder={t.chatInterface.placeholder || "Type here..."}
                            className="h-full min-h-[200px] resize-none text-base p-4 bg-background/50 focus:bg-background transition-colors"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between items-center pt-2">
                    <p className="text-xs text-muted-foreground">Press Send to notify parents instantly.</p>
                    <Button type="submit" disabled={isLoading} size="lg" className="gap-2 shadow-lg shadow-primary/20">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {t.chatInterface.send}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Quick Replies */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {quickReplies.map((reply, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="whitespace-nowrap bg-background hover:bg-primary/5 border-dashed"
                onClick={() => form.setValue('notes', reply)}
              >
                {reply}
              </Button>
            ))}
          </div>
        </div>

        {/* Right Column: History (Mock) */}
        <div className="hidden lg:flex flex-col h-full">
          <Card className="h-full flex flex-col bg-muted/30 border-none shadow-inner">
            <CardHeader className="pb-3 bg-muted/50 border-b">
              <CardTitle className="text-base text-muted-foreground flex items-center gap-2">
                <History className="h-4 w-4" /> {t.chatInterface.history}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
              {/* Mock History Items */}
              <div className="flex flex-col gap-1 items-end">
                <div className="bg-primary/10 text-primary-foreground text-sm p-3 rounded-2xl rounded-tr-none max-w-[85%] text-foreground">
                  Mrs. Jones, just letting you know {childName} had a great day today!
                </div>
                <span className="text-[10px] text-muted-foreground mr-2">Yesterday, 15:30</span>
              </div>
              <div className="flex flex-col gap-1 items-start">
                <div className="bg-background border text-sm p-3 rounded-2xl rounded-tl-none max-w-[85%] shadow-sm">
                  Thank you so much! Great to hear.
                </div>
                <span className="text-[10px] text-muted-foreground ml-2">Yesterday, 16:45</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NotifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotifyPageContent />
    </Suspense>
  )
}
