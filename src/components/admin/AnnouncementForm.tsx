
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
import { Switch } from '@/components/ui/switch';
import { Loader2, CheckCircle, CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/db/firebase';
import { uploadFile } from '@/lib/firebase/storage';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { getSchoolAuth } from '@/lib/firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn, eventDays, htmlToText, lastDayOf, textToHtml, ukDay, ukMidday } from '@/lib/utils';
import { addDays, differenceInCalendarDays, format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Progress } from '../ui/progress';

// One thing on the admin list: a news post, its calendar entry (when it has a day), or both.
// Older calendar entries may have no news post; saving one gives it one. isBanner comes from the
// site's one banner record, which is what the homepage uses.
export type AdminItem = { news: NewsPostWithId | null; event: CalendarEventWithId | null; isBanner: boolean };

const DAY_FORMAT = 'EEEE d MMMM yyyy';

const formSchema = z.object({
  title_en: z.string().trim().min(5, { message: 'Title must be at least 5 characters.' }).max(200, { message: 'Keep the title under 200 characters.' }),
  title_cy: z.string().trim().max(200, { message: 'Keep the title under 200 characters.' }).optional(),
  body_en: z.string().max(10000, { message: 'Keep the text under 10,000 characters.' }).optional(),
  body_cy: z.string().max(10000, { message: 'Keep the text under 10,000 characters.' }).optional(),
  // null means no day (an empty value would make the form show the day it was opened with)
  date: z.date().nullable().optional(),
  // The last day, for something over several days in a row (parents' evenings)
  endDate: z.date().nullable().optional(),
  isUrgent: z.boolean().default(false),
  attachment: z.any().optional(),
});

type AnnouncementFormValues = z.infer<typeof formSchema>;

// One day box: the button opens a calendar, and a second button clears it. "after" allows only
// days later than it (for the last day).
function DayBox({ value, onChange, placeholder, removeLabel, after }: {
  value: Date | null | undefined;
  onChange: (day: Date | null) => void;
  placeholder: string;
  removeLabel: string;
  after?: Date | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2 pt-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button variant="outline" className={cn('w-full sm:w-[280px] pl-3 text-left font-normal', !value && 'text-muted-foreground')}>
              {value ? format(value, DAY_FORMAT) : <span>{placeholder}</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            defaultMonth={value ?? after ?? undefined}
            disabled={after ? { before: addDays(after, 1) } : undefined}
            onSelect={(picked) => { onChange(picked ?? null); setIsOpen(false); }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          <X className="mr-1 h-4 w-4" /> {removeLabel}
        </Button>
      )}
    </div>
  );
}

interface AnnouncementFormProps {
  onSuccess: () => void;
  existing?: AdminItem | null;
}

export function AnnouncementForm({ onSuccess, existing }: AnnouncementFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const news = existing?.news ?? null;
  const event = existing?.event ?? null;

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: news?.title_en || event?.title_en || '',
      title_cy: news?.title_cy || event?.title_cy || '',
      body_en: news ? htmlToText(news.body_en || '') : event?.description_en || '',
      body_cy: news ? htmlToText(news.body_cy || '') : event?.description_cy || '',
      date: event ? ukDay(event.start) : null,
      endDate: event ? lastDayOf(event.start, event.end) : null,
      isUrgent: existing?.isBanner ?? false,
      attachment: undefined,
    },
  });

  const day = form.watch('date');
  const lastDay = form.watch('endDate');

  const onSubmit = async (values: AnnouncementFormValues) => {
    const titleEn = values.title_en.trim();
    const titleCy = values.title_cy?.trim() || titleEn;
    const bodyEn = values.body_en?.trim() || '';
    // An empty Welsh box shows the English on the Welsh version of the site
    const bodyCy = values.body_cy?.trim() || bodyEn;

    if (values.endDate && (!values.date || differenceInCalendarDays(values.endDate, values.date) <= 0)) {
      form.setError('endDate', { message: 'The last day must be after the first day.' });
      return;
    }

    setIsLoading(true);

    try {
      // Only a new upload is sent; otherwise the post keeps the file it has now (see savePost)
      let attachment: { url: string; name: string } | null = null;
      const fileToUpload = values.attachment instanceof File ? values.attachment : null;

      if (fileToUpload) {
        setUploadProgress(0);
        const url = await uploadFile(fileToUpload, 'attachments', (progress) => {
          setUploadProgress(progress);
        });
        attachment = { url, name: fileToUpload.name };
        setUploadProgress(100);
      }

      const now = new Date().toISOString();
      // All-day dates are saved at midday UK time, whatever the device's time zone, so the day stays
      // the same for phones (midnight in British Summer Time is still the day before in UTC)
      const middayOf = (day: Date | null | undefined) => (day ? ukMidday(day) : null);
      const middayOfDay = middayOf(values.date);
      const middayOfLastDay = values.date ? middayOf(values.endDate) : null;
      const editor = isFirebaseConfigured ? getSchoolAuth().currentUser?.email || 'admin' : 'admin';

      await db.savePost({
        newsId: news?.id ?? null,
        eventId: event?.id ?? null,
        attachment,
        editor,
        news: {
          title_en: titleEn,
          title_cy: titleCy,
          // The day is saved with the post separately (see savePost), so it is never stuck in the text
          body_en: textToHtml(bodyEn),
          body_cy: textToHtml(bodyCy),
          isUrgent: values.isUrgent,
          // The day it was posted; editing keeps the original
          date: news?.date || now,
          published: true,
          category: values.isUrgent ? 'Urgent' : middayOfDay ? 'Event' : 'General',
          lastEdited: now,
        },
        event: middayOfDay ? {
          title_en: titleEn,
          title_cy: titleCy,
          description_en: bodyEn,
          description_cy: bodyCy,
          start: middayOfDay,
          ...(middayOfLastDay ? { end: middayOfLastDay } : {}),
          allDay: true,
          isUrgent: false,
          showOnHomepage: true,
          relevantTo: ['All'],
          tags: [],
          published: true,
        } : null,
      });

      toast({ title: existing ? 'Changes saved' : 'Added', description: 'It is on the website now.' });

      form.reset();
      onSuccess();

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({ title: 'Not saved', description: 'Something went wrong. Check your internet connection and try again. If it keeps happening, sign out and back in.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Sports Day" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="body_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What do you want to say?</FormLabel>
              <FormControl>
                <Textarea placeholder="Write your message to parents here." className="min-h-[120px]" {...field} />
              </FormControl>
              <FormDescription>Leave a blank line between paragraphs.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-5 rounded-lg border p-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Day it happens (optional)</FormLabel>
                <FormDescription>
                  Only fill this in if parents should put it in their diary. It then also goes under Upcoming Events
                  and onto parents&apos; phones.
                </FormDescription>
                <DayBox
                  value={field.value}
                  onChange={(picked) => { field.onChange(picked); if (!picked) form.setValue('endDate', null); }}
                  placeholder="Pick the day"
                  removeLabel="Remove the day"
                />
                <FormMessage />
              </FormItem>
            )}
          />

          {day && (
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Last day (optional)</FormLabel>
                  <FormDescription>
                    Only if it runs over several days in a row, like parents&apos; evenings. Say which day is for
                    which year group in the message. Days far apart? Add each one on its own.
                  </FormDescription>
                  <DayBox
                    value={field.value}
                    onChange={(picked) => { field.onChange(picked); form.clearErrors('endDate'); }}
                    placeholder="Pick the last day"
                    removeLabel="Remove the last day"
                    after={day}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className="space-y-4 rounded-lg border p-4">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Welsh version (Cymraeg, optional)</p>
            <p className="text-sm text-muted-foreground">
              Shown when visitors switch the site to Cymraeg. Leave blank to show the English.
            </p>
          </div>
          <FormField
            control={form.control}
            name="title_cy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title (Welsh)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Diwrnod Chwaraeon" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="body_cy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text (Welsh)</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField control={form.control} name="isUrgent" render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-4 space-y-0 rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Red banner on the homepage</FormLabel>
              <FormDescription>
                For anything parents must see today, like a closure. Only one post has the banner at a time.
              </FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />

        <FormField
          control={form.control}
          name="attachment"
          render={({ field: { onChange, value: _value, ...rest } }) => (
            <FormItem>
              <FormLabel>Attach a letter or picture (optional)</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={(e) => onChange(e.target.files?.[0])}
                    {...rest}
                  />
                </div>
              </FormControl>
              <FormDescription>A PDF or a picture, up to 10 MB.</FormDescription>
              {uploadProgress !== null && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="w-full mt-2" />
              )}
              {uploadProgress === 100 && (
                <div className="flex items-center text-sm text-green-600 mt-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>Upload complete!</span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Says where it will show, so nobody has to guess */}
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {day ? (
              <>Goes under <strong className="text-foreground">Latest News</strong> and <strong className="text-foreground">Upcoming Events</strong> ({eventDays(ukMidday(day), lastDay ? ukMidday(lastDay) : undefined, 'en')}), and onto parents&apos; phones.</>
            ) : (
              <>Goes under <strong className="text-foreground">Latest News</strong>.</>
            )}
          </p>
          <Button type="submit" disabled={isLoading} className="w-full shrink-0 sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? 'Save changes' : 'Add to the website'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
