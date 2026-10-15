
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
import { Loader2, CheckCircle, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/db/firebase';
import { uploadFile } from '@/lib/firebase/storage';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { getSchoolAuth } from '@/lib/firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn, htmlToText, textToHtml } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Progress } from '../ui/progress';

type Announcement = (NewsPostWithId & { type: 'news' }) | (CalendarEventWithId & { type: 'event' });

// 'news' posts go on the News page; 'event' dates go on the Events page and the phone calendar feed
export type AnnouncementKind = 'news' | 'event';

const formSchema = z.object({
  title_en: z.string().trim().min(5, { message: 'Title must be at least 5 characters.' }).max(200, { message: 'Keep the title under 200 characters.' }),
  title_cy: z.string().trim().max(200, { message: 'Keep the title under 200 characters.' }).optional(),
  body_en: z.string().max(10000, { message: 'Keep the text under 10,000 characters.' }).optional(),
  body_cy: z.string().max(10000, { message: 'Keep the text under 10,000 characters.' }).optional(),
  date: z.date().optional(),
  isUrgent: z.boolean().default(false),
  alsoNews: z.boolean().default(false),
  attachment: z.any().optional(),
});

type AnnouncementFormValues = z.infer<typeof formSchema>;

interface AnnouncementFormProps {
  kind: AnnouncementKind;
  onSuccess: () => void;
  existingAnnouncement?: Announcement | null;
}

export function AnnouncementForm({ kind, onSuccess, existingAnnouncement }: AnnouncementFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const editingNews = existingAnnouncement?.type === 'news' ? existingAnnouncement : null;
  const editingEvent = existingAnnouncement?.type === 'event' ? existingAnnouncement : null;
  const isEvent = kind === 'event';

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: existingAnnouncement?.title_en || '',
      title_cy: existingAnnouncement?.title_cy || '',
      body_en: editingNews ? htmlToText(editingNews.body_en || '') : editingEvent?.description_en || '',
      body_cy: editingNews ? htmlToText(editingNews.body_cy || '') : editingEvent?.description_cy || '',
      date: editingEvent ? new Date(editingEvent.start) : undefined,
      isUrgent: existingAnnouncement?.isUrgent || false,
      alsoNews: false,
      attachment: undefined,
    },
  });

  const onSubmit = async (values: AnnouncementFormValues) => {
    const titleEn = values.title_en.trim();
    const titleCy = values.title_cy?.trim() || titleEn;
    const bodyEn = values.body_en?.trim() || '';
    // An empty Welsh box shows the English on the Welsh version of the site
    const bodyCy = values.body_cy?.trim() || bodyEn;

    if (isEvent && !values.date) {
      form.setError('date', { message: 'Pick the date.' });
      return;
    }

    setIsLoading(true);

    try {
      let attachmentUrl = existingAnnouncement?.attachmentUrl || '';
      let attachmentName = existingAnnouncement?.attachmentName || '';
      const fileToUpload = values.attachment instanceof File ? values.attachment : null;

      if (fileToUpload) {
        setUploadProgress(0);
        attachmentUrl = await uploadFile(fileToUpload, 'attachments', (progress) => {
          setUploadProgress(progress);
        });
        attachmentName = fileToUpload.name;
        setUploadProgress(100);
      }

      const now = new Date().toISOString();
      // All-day dates are saved at midday UK time, so the day stays the same in every time zone
      // (midnight in British Summer Time is still the day before in UTC, which phones would show)
      const middayOfPickedDate = values.date ? new Date(new Date(values.date).setHours(12, 0, 0, 0)).toISOString() : null;
      const editor = isFirebaseConfigured ? getSchoolAuth().currentUser?.email || 'admin' : 'admin';

      const eventPayload = isEvent && middayOfPickedDate ? {
        title_en: titleEn,
        title_cy: titleCy,
        description_en: bodyEn,
        description_cy: bodyCy,
        start: middayOfPickedDate,
        allDay: true,
        // The homepage banner comes from news posts, so a date never sets it
        isUrgent: editingEvent ? !!editingEvent.isUrgent : false,
        showOnHomepage: true,
        relevantTo: ['All'],
        attachmentUrl,
        attachmentName,
        tags: [],
        published: true,
      } : null;

      // A date that is also posted as news gets a short line when there is no other text
      const eventLineEn = values.date ? `Event: ${titleEn} on ${format(values.date, 'PPP')}` : '';
      const eventLineCy = values.date ? `Digwyddiad: ${titleCy} ar ${format(values.date, 'PPP')}` : '';
      const isUrgent = isEvent ? false : values.isUrgent;
      const newsPayload = {
        title_en: titleEn,
        title_cy: titleCy,
        body_en: textToHtml(bodyEn || eventLineEn),
        body_cy: textToHtml(bodyCy || eventLineCy),
        isUrgent,
        attachmentUrl,
        attachmentName,
        date: editingNews ? editingNews.date : middayOfPickedDate || now,
        published: true,
        category: isUrgent ? 'Urgent' as const : isEvent ? 'Event' as const : 'General' as const,
        lastEdited: now,
      };

      if (editingEvent && eventPayload) {
        await db.updateCalendarEvent(editingEvent.id, eventPayload, false);
      } else if (editingNews) {
        await db.updateNews(editingNews.id, newsPayload);
      } else {
        // Saved together, so a date that is also posted as news never ends up half saved
        await db.createAnnouncement({
          event: eventPayload ?? undefined,
          news: !isEvent || values.alsoNews ? { ...newsPayload, createdBy: editor } : undefined,
        });
      }

      toast({ title: existingAnnouncement ? 'Changes saved' : 'Added', description: 'It is on the website now.' });

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

  const submitLabel = existingAnnouncement ? 'Save changes' : isEvent ? 'Add event' : 'Add news';

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
                <Input placeholder={isEvent ? 'e.g., Sports Day' : 'e.g., School closed today'} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isEvent && (
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Day of the event</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full md:w-[240px] pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP')
                        ) : (
                          <span>Pick the day</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="body_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{isEvent ? 'Details (optional)' : 'What do you want to say?'}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={isEvent ? 'e.g., Bring a water bottle and sun cream.' : 'Write your news here.'}
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>Leave a blank line between paragraphs.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  <Input placeholder={isEvent ? 'e.g., Diwrnod Chwaraeon' : 'e.g., Ysgol ar gau heddiw'} {...field} />
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
                <FormLabel>{isEvent ? 'Details (Welsh)' : 'Text (Welsh)'}</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {!isEvent && (
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
        )}

        {isEvent && !existingAnnouncement && (
          <FormField control={form.control} name="alsoNews" render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-4 space-y-0 rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel>Also put this under Latest News</FormLabel>
                <FormDescription>
                  Switch this on if parents need to read about it too, like a parents&apos; evening.
                </FormDescription>
              </div>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )} />
        )}

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

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
