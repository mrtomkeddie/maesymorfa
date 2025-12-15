
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useState } from 'react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { parentChildren as mockChildren } from '@/lib/mockData';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { cy } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const absenceFormSchema = (t: any) => z.object({
  childId: z.string({
    required_error: t.childId.required_error,
  }),
  startDate: z.date({ required_error: t.absenceDate.required_error_from }),
  endDate: z.date().optional(),
  reason: z.string().min(10, {
    message: t.reason.message,
  }),
  document: z.any().optional(),
});



const content = {
  en: {
    title: "Report an Absence",
    description: "Please complete the form below to report your child's absence.",
    form: {
      title: "Absence Details",
      description: "Please provide the details below.",
      childLabel: "Who is absent?",
      childPlaceholder: "Select your child",
      startDateLabel: "Start Date",
      endDateLabel: "End Date",
      datePlaceholder: "Pick a date",
      multiDayLabel: "This absence is for more than one day",
      reasonLabel: "Reason for Absence",
      reasonPlaceholder: "Please provide a brief reason (e.g., Unwell with a cold, Medical appointment)",
      documentLabel: "Upload Note (Optional)",
      documentDescription: "Doctor's note or appointment letter.",
      submitButton: "Submit Report",
    },
    success: {
      title: "Absence Reported",
      description: "We've notified the school office about {childName}.",
    },
    error: {
      title: "Submission Failed",
      description: "Could not submit the report. Please try again.",
    },
    formSchema: {
      childId: { required_error: 'Please select a child.' },
      absenceDate: { required_error_from: 'Please select a start date.' },
      reason: { message: 'Please provide a reason (min 10 chars).' }
    }
  },
  cy: {
    title: "Riportio Absenoldeb",
    description: "Cwblhewch y ffurflen isod i riportio absenoldeb eich plentyn.",
    form: {
      title: "Manylion Absenoldeb",
      description: "Rhowch y manylion isod.",
      childLabel: "Pwy sy'n absennol?",
      childPlaceholder: "Dewiswch eich plentyn",
      startDateLabel: "Dyddiad Dechrau",
      endDateLabel: "Dyddiad Gorffen",
      datePlaceholder: "Dewiswch ddyddiad",
      multiDayLabel: "Mwy nag un diwrnod",
      reasonLabel: "Rheswm",
      reasonPlaceholder: "Rhowch reswm byr...",
      documentLabel: "Uwchlwytho Nodyn (Dewisol)",
      documentDescription: "Nodyn meddyg neu lythyr.",
      submitButton: "Cyflwyno",
    },
    success: {
      title: "Adroddiad Wedi'i Dderbyn",
      description: "Wedi hysbysu'r swyddfa am {childName}.",
    },
    error: {
      title: "Methiant",
      description: "Ni ellid cyflwyno. Rhowch gynnig arall.",
    },
    formSchema: {
      childId: { required_error: 'Dewiswch blentyn.' },
      absenceDate: { required_error_from: 'Dewiswch ddyddiad.' },
      reason: { message: 'Rhowch reswm (o leiaf 10 nod).' }
    }
  }
};


export default function AbsencePage() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const t = content[language];
  const locale = language === 'cy' ? cy : undefined;

  const form = useForm<z.infer<ReturnType<typeof absenceFormSchema>>>({
    resolver: zodResolver(absenceFormSchema(t.formSchema)),
    defaultValues: {
      reason: "",
    }
  });

  async function onSubmit(values: z.infer<ReturnType<typeof absenceFormSchema>>) {
    setIsLoading(true);

    // In a real app, we'd fetch the parent's actual details
    const parentInfo = { name: "Jane Doe", email: "parent@example.com" };
    const childName = mockChildren.find(c => c.id === values.childId)?.name || 'Unknown Child';

    let dateString = format(values.startDate, 'PPP', { locale });
    if (values.endDate && isMultiDay) {
      dateString += ` - ${format(values.endDate, 'PPP', { locale })}`;
    }

    const messageBody = `
Child: ${childName}
Date of Absence: ${dateString}
Reason: ${values.reason}
---
Submitted by: ${parentInfo.name} (${parentInfo.email})
    `;

    try {
      await db.addInboxMessage({
        type: 'absence',
        subject: `Absence Report for ${childName}`,
        body: messageBody,
        sender: parentInfo,
        isRead: false,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: t.success.title,
        description: t.success.description.replace('{childName}', childName),
        variant: 'default',
      });

      form.reset();
      setIsMultiDay(false);

    } catch (error) {
      console.error("Failed to submit absence report:", error);
      toast({
        title: t.error.title,
        description: t.error.description,
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
          <p className="text-muted-foreground">
            {t.description}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

            {/* 1. Who is absent? - Visual Selector */}
            <FormField
              control={form.control}
              name="childId"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-lg font-semibold">{t.form.childLabel}</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {mockChildren.map((child) => {
                        const isSelected = field.value === child.id;
                        return (
                          <div
                            key={child.id}
                            onClick={() => field.onChange(child.id)}
                            className={cn(
                              "cursor-pointer relative overflow-hidden rounded-xl border-2 p-4 transition-all hover:shadow-md",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-border bg-card hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                  {child.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-bold text-base">{child.name}</p>
                                <p className="text-sm text-muted-foreground">{child.yearGroup}</p>
                              </div>
                              {isSelected && (
                                <div className="ml-auto bg-primary text-primary-foreground rounded-full p-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle>{t.form.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>{t.form.startDateLabel}</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={cn(
                                  'w-full pl-3 text-left font-normal h-11',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? format(field.value, 'PPP') : <span>{t.form.datePlaceholder}</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date("1900-01-01")}
                              initialFocus
                              locale={locale}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isMultiDay && (
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>{t.form.endDateLabel}</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={'outline'}
                                  className={cn(
                                    'w-full pl-3 text-left font-normal h-11',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  {field.value ? format(field.value, 'PPP') : <span>{t.form.datePlaceholder}</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => form.getValues('startDate') ? date < form.getValues('startDate') : date < new Date("1900-01-01")}
                                initialFocus
                                locale={locale}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="multi-day-switch" checked={isMultiDay} onCheckedChange={setIsMultiDay} />
                  <Label htmlFor="multi-day-switch">{t.form.multiDayLabel}</Label>
                </div>

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.form.reasonLabel}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t.form.reasonPlaceholder}
                          className="min-h-[100px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t.form.documentLabel}</FormLabel>
                      <FormControl>
                        <div className="flex items-center justify-center w-full">
                          <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-bray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:hover:bg-gray-600">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400" />
                              <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{t.form.documentDescription}</p>
                            </div>
                            <Input id="dropzone-file" type="file" className="hidden" onChange={(e) => field.onChange(e.target.files && e.target.files[0])} />
                          </label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.form.submitButton}
                  </Button>
                </div>

              </CardContent>
            </Card>

          </form>
        </Form>
      </div>
    </div>
  );
}
