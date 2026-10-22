
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
import { Loader2, CheckCircle, CalendarIcon, X, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/db/firebase';
import { uploadFile } from '@/lib/firebase/storage';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { FEATURES } from '@/lib/config/features';
import { getSchoolAuth } from '@/lib/firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
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
  // With the banner only: a notification on the phones that turned on school alerts
  sendAlert: z.boolean().default(false),
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

// Asks the server to send the alert for a saved post (src/app/api/alerts/route.ts). The post is
// already on the website by now, so a failure here only means the alert did not go.
type AlertOutcome = { devices: number; sent: number; failed: number } | { failed: 'not-set-up' | 'already-sent' | 'in-progress' | 'changed' | 'error' };
async function alertPhones(newsId: string): Promise<AlertOutcome> {
  try {
    const idToken = await getSchoolAuth().currentUser?.getIdToken();
    if (!idToken) return { failed: 'error' };
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ newsId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.sent === 'number') return { devices: Number(data.devices) || 0, sent: data.sent, failed: Number(data.failed) || 0 };
    return { failed: ['not-set-up', 'already-sent', 'in-progress', 'changed'].includes(data.error) ? data.error : 'error' };
  } catch {
    return { failed: 'error' };
  }
}

// Asks the server for a Welsh version of the English boxes (src/app/api/translate/route.ts)
type WelshOutcome = { title: string; body: string } | { failed: 'not-set-up' | 'signed-out' | 'error' };
async function askForWelsh(title: string, body: string): Promise<WelshOutcome> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (isFirebaseConfigured) {
      const idToken = await getSchoolAuth().currentUser?.getIdToken();
      if (!idToken) return { failed: 'signed-out' };
      headers.Authorization = `Bearer ${idToken}`;
    }
    const res = await fetch('/api/translate', { method: 'POST', headers, body: JSON.stringify({ title, body }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok && typeof data.title === 'string' && typeof data.body === 'string') return { title: data.title, body: data.body };
    if (data.error === 'not-set-up') return { failed: 'not-set-up' };
    if (data.error === 'not-signed-in' || data.error === 'not-admin') return { failed: 'signed-out' };
    return { failed: 'error' };
  } catch {
    return { failed: 'error' };
  }
}

interface AnnouncementFormProps {
  onSuccess: () => void;
  existing?: AdminItem | null;
}

export function AnnouncementForm({ onSuccess, existing }: AnnouncementFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  // Open while asking whether to replace Welsh that someone already typed
  const [confirmReplace, setConfirmReplace] = useState(false);

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
      // On for a new banner; off when editing a post that already has one, so fixing a typo
      // does not alert every phone a second time
      sendAlert: !existing?.isBanner,
      attachment: undefined,
    },
  });

  const day = form.watch('date');
  const lastDay = form.watch('endDate');
  const isUrgent = form.watch('isUrgent');
  const sendAlert = form.watch('sendAlert');

  const translate = async () => {
    const titleEn = form.getValues('title_en').trim();
    const bodyEn = form.getValues('body_en')?.trim() || '';
    setIsTranslating(true);
    const welsh = await askForWelsh(titleEn, bodyEn);
    setIsTranslating(false);

    if ('title' in welsh) {
      form.setValue('title_cy', welsh.title, { shouldDirty: true, shouldValidate: true });
      form.setValue('body_cy', welsh.body, { shouldDirty: true, shouldValidate: true });
      toast({ title: 'Welsh added', description: 'Read it through before you save. A computer translated it, so it can get words wrong.' });
    } else if (welsh.failed === 'not-set-up') {
      toast({ title: 'Translation is not set up yet', description: 'Type the Welsh yourself, or leave the boxes blank to show the English.' });
    } else if (welsh.failed === 'signed-out') {
      toast({ title: 'Not translated', description: 'Sign out and back in, then try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Not translated', description: 'Something went wrong. Try again in a minute, or type the Welsh yourself.', variant: 'destructive' });
    }
  };

  const onTranslateClick = () => {
    if (form.getValues('title_en').trim().length < 5) {
      form.setError('title_en', { type: 'manual', message: 'Write the English title first, then press Translate to Welsh.' });
      return;
    }
    // Never write over Welsh that someone typed without asking first
    if (form.getValues('title_cy')?.trim() || form.getValues('body_cy')?.trim()) {
      setConfirmReplace(true);
      return;
    }
    translate();
  };

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

      const savedId = await db.savePost({
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

      const title = existing ? 'Changes saved' : 'Added';
      if (values.isUrgent && values.sendAlert && isFirebaseConfigured) {
        const alert = await alertPhones(savedId);
        const phones = (n: number) => `${n} ${n === 1 ? 'phone' : 'phones'}`;
        const retryHint = 'To try again, open the post, turn on "Send an alert to phones" and save.';
        if ('sent' in alert) {
          toast({
            title,
            description: alert.devices === 0
              ? 'It is on the website now. No phones have turned on school alerts yet.'
              : alert.sent === 0
                ? 'It is on the website now. None of the phones on the list take alerts any more, so no alert went out.'
                : `It is on the website now, and the alert was sent to ${phones(alert.sent)}.`
                  + (alert.failed > 0 ? ` It could not reach ${phones(alert.failed)}. ${retryHint}` : ''),
          });
        } else if (alert.failed === 'not-set-up') {
          toast({ title, description: 'It is on the website now. Phone alerts are not set up yet, so no alert went out.' });
        } else if (alert.failed === 'already-sent') {
          toast({ title, description: 'It is on the website now. This alert reached every phone a few minutes ago, so it was not sent again.' });
        } else if (alert.failed === 'changed') {
          toast({ title, description: 'It is on the website now. Someone changed this post while the alert was getting ready, so this alert was not sent. Check the post, then try again if it still needs one.' });
        } else if (alert.failed === 'in-progress') {
          toast({ title, description: 'It is on the website now. An alert for this post is still going out. Wait a minute before sending another.' });
        } else {
          toast({
            title: 'Saved, but the alert did not go',
            description: `It is on the website now. ${retryHint}`,
            variant: 'destructive',
          });
        }
      } else {
        toast({ title, description: 'It is on the website now.' });
      }

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
                <Input
                  placeholder="e.g., Sports Day"
                  {...field}
                  // The "write the title first" note from Translate to Welsh goes once they start typing
                  onChange={(e) => { field.onChange(e); if (form.formState.errors.title_en?.type === 'manual') form.clearErrors('title_en'); }}
                />
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

        {/* With Welsh turned off the boxes are hidden; a post being edited keeps the Welsh it has */}
        {FEATURES.enableWelsh && (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Welsh version (Cymraeg, optional)</p>
              <p className="text-sm text-muted-foreground">
                Shown when visitors switch the site to Cymraeg. Leave blank to show the English, or press
                Translate to Welsh and read the result before you save.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={onTranslateClick} disabled={isTranslating || isLoading} className="w-full shrink-0 sm:w-auto">
              {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
              {isTranslating ? 'Translating…' : 'Translate to Welsh'}
            </Button>
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
        )}

        <div className="space-y-4 rounded-lg border p-4">
          <FormField control={form.control} name="isUrgent" render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 space-y-0">
              <div className="space-y-0.5">
                <FormLabel>Red banner on the homepage</FormLabel>
                <FormDescription>
                  For anything parents must see today, like a closure. Only one post has the banner at a time.
                </FormDescription>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )} />

          {isUrgent && (
            <FormField control={form.control} name="sendAlert" render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-4 space-y-0 border-t pt-4">
                <div className="space-y-0.5">
                  <FormLabel>Send an alert to phones</FormLabel>
                  <FormDescription>
                    Parents who turned on school alerts get a notification with the title, straight away.
                    Leave this off if you are only fixing a mistake.
                  </FormDescription>
                </div>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
          )}
        </div>

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
            {isUrgent && sendAlert && <> Also sends an alert to phones.</>}
          </p>
          <Button type="submit" disabled={isLoading || isTranslating} className="w-full shrink-0 sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existing ? 'Save changes' : 'Add to the website'}
          </Button>
        </div>
      </form>

      <AlertDialog open={confirmReplace} onOpenChange={setConfirmReplace}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace the Welsh?</AlertDialogTitle>
            <AlertDialogDescription>
              The Welsh boxes already have words in them. A new translation of the English will take their place.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my Welsh</AlertDialogCancel>
            <AlertDialogAction onClick={translate}>Replace it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}
