
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
import { Loader2, CheckCircle, CalendarIcon, Languages } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/db/firebase';
import { uploadFile } from '@/lib/firebase/storage';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { adminIdToken, getSchoolAuth } from '@/lib/firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn, htmlToText, textToHtml } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Progress } from '../ui/progress';

type Announcement = (NewsPostWithId & { type: 'news' }) | (CalendarEventWithId & { type: 'event' });

const formSchema = z.object({
  title_en: z.string().trim().min(5, { message: 'Title must be at least 5 characters.' }).max(200, { message: 'Keep the title under 200 characters.' }),
  title_cy: z.string().trim().max(200, { message: 'Keep the title under 200 characters.' }).optional(),
  body_en: z.string().max(10000, { message: 'Keep the text under 10,000 characters.' }).optional(),
  body_cy: z.string().max(10000, { message: 'Keep the text under 10,000 characters.' }).optional(),
  date: z.date().optional(),
  isUrgent: z.boolean().default(false),
  attachment: z.any().optional(),
});

type AnnouncementFormValues = z.infer<typeof formSchema>;

interface AnnouncementFormProps {
  onSuccess: () => void;
  existingAnnouncement?: Announcement | null;
}

export function AnnouncementForm({ onSuccess, existingAnnouncement }: AnnouncementFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const editingNews = existingAnnouncement?.type === 'news' ? existingAnnouncement : null;
  const editingEvent = existingAnnouncement?.type === 'event' ? existingAnnouncement : null;

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: existingAnnouncement?.title_en || '',
      title_cy: existingAnnouncement?.title_cy || '',
      body_en: editingNews ? htmlToText(editingNews.body_en || '') : editingEvent?.description_en || '',
      body_cy: editingNews ? htmlToText(editingNews.body_cy || '') : editingEvent?.description_cy || '',
      date: editingEvent ? new Date(editingEvent.start) : undefined,
      isUrgent: existingAnnouncement?.isUrgent || false,

      attachment: undefined,
    },
  });

  const handleTranslate = async () => {
    const title = form.getValues('title_en')?.trim() || '';
    const body = form.getValues('body_en') || '';
    if (!title) {
      form.setError('title_en', { message: 'Add the English title first.' });
      return;
    }
    setIsTranslating(true);
    try {
      const token = await adminIdToken();
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Translation failed. Please try again.');
      form.setValue('title_cy', data.title, { shouldDirty: true, shouldValidate: true });
      form.setValue('body_cy', data.body, { shouldDirty: true, shouldValidate: true });
      toast({ title: 'Welsh added', description: 'Read it through and fix anything before you save.' });
    } catch (error) {
      toast({ title: 'Could not translate', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setIsTranslating(false);
    }
  };

  const onSubmit = async (values: AnnouncementFormValues) => {
    const titleEn = values.title_en.trim();
    const titleCy = values.title_cy?.trim() || titleEn;
    const bodyEn = values.body_en?.trim() || '';
    // An empty Welsh box shows the English on the Welsh version of the site
    const bodyCy = values.body_cy?.trim() || bodyEn;

    // A new announcement needs a date (calendar entry), some text (news post) or the urgent banner
    if (!existingAnnouncement && !values.date && !bodyEn && !values.isUrgent) {
      form.setError('body_en', { message: 'Add some text for a news post, or pick a date for a calendar entry.' });
      return;
    }
    if (editingEvent && !values.date) {
      form.setError('date', { message: 'A calendar entry needs a date.' });
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

      const eventPayload = values.date ? {
        title_en: titleEn,
        title_cy: titleCy,
        description_en: bodyEn,
        description_cy: bodyCy,
        start: middayOfPickedDate!,
        allDay: true,
        // The homepage banner comes from news posts, so editing an event leaves this as it was
        isUrgent: editingEvent ? !!editingEvent.isUrgent : values.isUrgent,
        showOnHomepage: true,
        relevantTo: ['All'],
        attachmentUrl,
        attachmentName,
        tags: [],
        published: true,
      } : null;

      const eventLineEn = values.date ? `Event: ${titleEn} on ${format(values.date, 'PPP')}` : '';
      const eventLineCy = values.date ? `Digwyddiad: ${titleCy} ar ${format(values.date, 'PPP')}` : '';
      const newsPayload = {
        title_en: titleEn,
        title_cy: titleCy,
        body_en: textToHtml(bodyEn || eventLineEn),
        body_cy: textToHtml(bodyCy || eventLineCy),
        isUrgent: values.isUrgent,
        attachmentUrl,
        attachmentName,
        date: editingNews ? editingNews.date : middayOfPickedDate || now,
        published: true,
        category: values.isUrgent ? 'Urgent' as const : 'General' as const,
        lastEdited: now,
      };

      // Editing changes only the item being edited. A new announcement becomes a calendar entry,
      // a news post, or both, saved together so it never ends up half saved.
      if (editingEvent && eventPayload) {
        await db.updateCalendarEvent(editingEvent.id, eventPayload, false);
      } else if (editingNews) {
        await db.updateNews(editingNews.id, newsPayload);
      } else {
        await db.createAnnouncement({
          event: eventPayload ?? undefined,
          news: bodyEn || values.isUrgent ? { ...newsPayload, createdBy: editor } : undefined,
        });
      }

      toast({ title: 'Saved', description: 'It is live on the website now.' });

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
                <Input placeholder="e.g., School Sports Day" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!editingNews && (
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Event Date {editingEvent ? '' : '(Optional)'}</FormLabel>
                <FormDescription>
                  Adding a date will create a calendar entry for this announcement.
                </FormDescription>
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
                          <span>Pick a date</span>
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
              <FormLabel>Body / Description {editingNews ? '' : '(Optional)'}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide more details about the announcement..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              {!existingAnnouncement && (
                <FormDescription>
                  Adding a body will create a news post for this announcement. Leave a blank line between paragraphs.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Welsh version (Cymraeg)</p>
              <p className="text-sm text-muted-foreground">
                Shown when visitors switch the site to Cymraeg. Leave blank to show the English.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleTranslate} disabled={isTranslating || isLoading} className="shrink-0">
              {isTranslating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Languages className="mr-2 h-4 w-4" />}
              Translate from English
            </Button>
          </div>
          <FormField
            control={form.control}
            name="title_cy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title (Welsh)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Diwrnod Chwaraeon yr Ysgol" {...field} />
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
                <FormLabel>Body / Description (Welsh)</FormLabel>
                <FormControl>
                  <Textarea className="min-h-[100px]" {...field} />
                </FormControl>
                <FormDescription>
                  Translations are done by computer. Read them through before you save.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* The homepage banner comes from news posts, so it is not offered when editing a calendar entry */}
        {!editingEvent && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel>Urgent Homepage Banner</FormLabel>
              <FormDescription>
                Marking this as urgent will create a news post and display it as a banner on the homepage.
              </FormDescription>
            </div>
            <FormField control={form.control} name="isUrgent" render={({ field }) => (
              <FormItem><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )} />
          </div>
        </div>
        )}

        <FormField
          control={form.control}
          name="attachment"
          render={({ field: { onChange, value: _value, ...rest } }) => (
            <FormItem>
              <FormLabel>Attachment (Optional)</FormLabel>
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
          <Button type="submit" disabled={isLoading || isTranslating}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
