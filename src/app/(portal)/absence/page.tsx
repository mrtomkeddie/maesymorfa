
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
import { LanguageToggle } from '../layout';
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
      title: "Absence Form",
      description: "For security, you can only select children linked to your account.",
      childLabel: "Child's Name",
      childPlaceholder: "Select your child",
      startDateLabel: "Start Date of Absence",
      endDateLabel: "End Date of Absence",
      datePlaceholder: "Pick a date",
      multiDayLabel: "This absence is for more than one day",
      reasonLabel: "Reason for Absence",
      reasonPlaceholder: "e.g., Unwell with a cold.",
      documentLabel: "Upload a Document (Optional)",
      documentDescription: "e.g., a doctor's note or appointment confirmation.",
      submitButton: "Submit Report",
    },
    success: {
        title: "Absence Reported Successfully",
        description: "We've received the absence report for {childName}. The school office has been notified.",
    },
    error: {
        title: "Submission Failed",
        description: "Could not submit the absence report. Please try again later or contact the school office directly.",
    },
    formSchema: {
        childId: { required_error: 'Please select a child.' },
        absenceDate: { required_error_from: 'Please select a start date for the absence.' },
        reason: { message: 'Please provide a brief reason for the absence (at least 10 characters).' }
    }
  },
  cy: {
    title: "Riportio Absenoldeb",
    description: "Cwblhewch y ffurflen isod i riportio absenoldeb eich plentyn.",
    form: {
      title: "Ffurflen Absenoldeb",
      description: "Er diogelwch, dim ond plant sy'n gysylltiedig â'ch cyfrif y gallwch eu dewis.",
      childLabel: "Enw'r Plentyn",
      childPlaceholder: "Dewiswch eich plentyn",
      startDateLabel: "Dyddiad Dechrau'r Absenoldeb",
      endDateLabel: "Dyddiad Gorffen yr Absenoldeb",
      datePlaceholder: "Dewiswch ddyddiad",
      multiDayLabel: "Mae'r absenoldeb hwn am fwy nag un diwrnod",
      reasonLabel: "Rheswm dros Absenoldeb",
      reasonPlaceholder: "e.e., Yn sâl gydag annwyd.",
      documentLabel: "Uwchlwytho Dogfen (Dewisol)",
      documentDescription: "e.e., nodyn meddyg neu gadarnhad apwyntiad.",
      submitButton: "Cyflwyno'r Adroddiad",
    },
    success: {
        title: "Absenoldeb Wedi'i Riportio'n Llwyddiannus",
        description: "Rydym wedi derbyn yr adroddiad absenoldeb ar gyfer {childName}. Mae swyddfa'r ysgol wedi'i hysbysu.",
    },
    error: {
        title: "Methiant Cyflwyno",
        description: "Ni ellid cyflwyno'r adroddiad absenoldeb. Rhowch gynnig arall arni yn nes ymlaen neu cysylltwch â swyddfa'r ysgol yn uniongyrchol.",
    },
    formSchema: {
        childId: { required_error: 'Dewiswch blentyn.' },
        absenceDate: { required_error_from: 'Dewiswch ddyddiad dechrau ar gyfer yr absenoldeb.' },
        reason: { message: 'Rhowch reswm byr dros yr absenoldeb (o leiaf 10 nod).' }
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
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
          <p className="text-muted-foreground">
             {t.description}
          </p>
        </div>
        <LanguageToggle />
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t.form.title}</CardTitle>
          <CardDescription>
            {t.form.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="childId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.form.childLabel}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t.form.childPlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {mockChildren.map((child) => (
                          <SelectItem key={child.id} value={child.id}>
                            {child.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
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
                                  'w-full justify-start text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, 'PPP') : <span>{t.form.datePlaceholder}</span>}
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

                  <div className="flex items-center space-x-2">
                    <Switch id="multi-day-switch" checked={isMultiDay} onCheckedChange={setIsMultiDay} />
                    <Label htmlFor="multi-day-switch">{t.form.multiDayLabel}</Label>
                  </div>
                  
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
                                    'w-full justify-start text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, 'PPP') : <span>{t.form.datePlaceholder}</span>}
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

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.form.reasonLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.form.reasonPlaceholder}
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
                      <div className="relative">
                          <Input type="file" className="pl-12" onChange={(e) => field.onChange(e.target.files && e.target.files[0])} />
                          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <Upload className="h-5 w-5 text-muted-foreground" />
                          </div>
                      </div>
                    </FormControl>
                    <FormDescription>
                      {t.form.documentDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t.form.submitButton}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
