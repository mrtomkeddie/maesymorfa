
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
import { Loader2, CheckCircle, CalendarIcon, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/types';
import { uploadFile } from '@/lib/firebase/storage';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { Progress } from '../ui/progress';
import { Checkbox } from '../ui/checkbox';
import { yearGroups as allYearGroups } from './ChildForm';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

type Announcement = (NewsPostWithId & { type: 'news' }) | (CalendarEventWithId & { type: 'event' });

const yearGroupOptions = ['All', ...allYearGroups];

const formSchema = z.object({
  title_en: z.string().min(5, { message: 'Title must be at least 5 characters.' }),
  body_en: z.string().optional(),
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title_en: existingAnnouncement?.title_en || '',
      body_en: (existingAnnouncement?.type === 'news' ? existingAnnouncement.body_en : existingAnnouncement?.description_en) || '',
      date: existingAnnouncement?.type === 'event' ? new Date(existingAnnouncement.start) : undefined,
      isUrgent: existingAnnouncement?.isUrgent || false,

      attachment: undefined,
    },
  });

  const onSubmit = async (values: AnnouncementFormValues) => {
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

      const isCalendarEvent = !!values.date;

      if (isCalendarEvent) {
        const eventPayload = {
          title_en: values.title_en,
          title_cy: values.title_en,
          description_en: values.body_en,
          description_cy: values.body_en,
          start: values.date!.toISOString(),
          allDay: true,
          isUrgent: values.isUrgent,
          showOnHomepage: true,
          relevantTo: ['All'],
          attachmentUrl,
          attachmentName,
          tags: [],
          published: true,
        };

        if (existingAnnouncement && existingAnnouncement.type === 'event') {
          await db.updateCalendarEvent(existingAnnouncement.id, eventPayload, false);
        } else {
          await db.addCalendarEvent(eventPayload, false);
        }
      }

      if (values.body_en || values.isUrgent) {
        const newsPayload = {
          title_en: values.title_en,
          title_cy: values.title_en,
          body_en: values.body_en || `Event: ${values.title_en} on ${format(values.date!, 'PPP')}`,
          body_cy: values.body_en || `Digwyddiad: ${values.title_en} ar ${format(values.date!, 'PPP')}`,
          isUrgent: values.isUrgent,
          attachmentUrl,
          attachmentName,
          date: (values.date || new Date()).toISOString(),
          slug: existingAnnouncement?.type === 'news' ? existingAnnouncement.slug : values.title_en.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
          published: true,
          category: values.isUrgent ? 'Urgent' as const : 'General' as const,
          createdBy: 'admin@example.com',
          lastEdited: new Date().toISOString(),
        };

        if (existingAnnouncement && existingAnnouncement.type === 'news') {
          await db.updateNews(existingAnnouncement.id, newsPayload);
        } else if (!existingAnnouncement || existingAnnouncement.type === 'event') {
          await db.addNews(newsPayload);
        }
      }

      toast({ title: 'Success!', description: 'Announcement has been saved.' });

      form.reset();
      onSuccess();

    } catch (error) {
      console.error('Error submitting form:', error);
      toast({ title: 'Error', description: 'Something went wrong. Please try again.' });
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

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Event Date (Optional)</FormLabel>
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

        <FormField
          control={form.control}
          name="body_en"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Body / Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide more details about the announcement..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Adding a body will create a news post for this announcement.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <FormField
          control={form.control}
          name="attachment"
          render={({ field: { onChange, ...rest } }) => (
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
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingAnnouncement ? 'Update Announcement' : 'Create Announcement'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
