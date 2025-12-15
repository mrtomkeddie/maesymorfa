
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
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db';
import { uploadFile, deleteFile } from '@/lib/firebase/storage';
import { DocumentWithId } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '../ui/progress';
import { useLanguage } from '@/app/(public)/LanguageProvider';

export const documentCategories = [
  "Policy",
  "Term Dates",
  "Lunch Menu",
  "Newsletter",
  "Permission Slip",
  "Other"
];

const formSchema = (t: any) => z.object({
  title: z.string().min(3, { message: t.title_message }),
  category: z.string({ required_error: t.category_required_error }),
  file: z.any().refine(file => (file && typeof file.name === 'string') || typeof file === 'string', {
    message: t.file_message,
  }),
});

const content = {
  en: {
    formSchema: {
      title_message: 'Title must be at least 3 characters.',
      category_required_error: 'Please select a category.',
      file_message: 'A file upload is required.',
    },
    titleLabel: 'Document Title',
    titlePlaceholder: 'e.g., Autumn Term Lunch Menu',
    categoryLabel: 'Category',
    categoryPlaceholder: 'Select a category',
    fileLabel: {
      edit: 'Replace File',
      add: 'File Upload'
    },
    fileDesc: 'Please upload PDF files only. Max size 5MB.',
    uploadComplete: 'Upload complete!',
    toast: {
      fileError: { title: "File Error", description: "A file is required. Please upload a PDF." },
      updateSuccess: { title: "Success!", description: "Document has been updated." },
      addSuccess: { title: "Success!", description: "New document has been uploaded." },
      error: { title: "Error", description: "Something went wrong. Please try again." },
    },
    submitButton: {
      update: 'Update Document',
      add: 'Upload Document'
    }
  },
  cy: {
    formSchema: {
      title_message: 'Rhaid i\'r teitl fod o leiaf 3 nod.',
      category_required_error: 'Dewiswch gategori.',
      file_message: 'Mae angen uwchlwytho ffeil.',
    },
    titleLabel: 'Teitl y Ddogfen',
    titlePlaceholder: 'e.e., Bwydlen Ginio Tymor yr Hydref',
    categoryLabel: 'Categori',
    categoryPlaceholder: 'Dewiswch gategori',
    fileLabel: {
      edit: 'Amnewid Ffeil',
      add: 'Uwchlwytho Ffeil'
    },
    fileDesc: 'Uwchlwythwch ffeiliau PDF yn unig. Maint mwyaf 5MB.',
    uploadComplete: 'Wedi\'i uwchlwytho\'n llwyddiannus!',
    toast: {
      fileError: { title: "Gwall Ffeil", description: "Mae angen ffeil. Uwchlwythwch PDF." },
      updateSuccess: { title: "Llwyddiant!", description: "Mae'r ddogfen wedi'i diweddaru." },
      addSuccess: { title: "Llwyddiant!", description: "Mae dogfen newydd wedi'i huwchlwytho." },
      error: { title: "Gwall", description: "Aeth rhywbeth o'i le. Ceisiwch eto." },
    },
    submitButton: {
      update: 'Diweddaru\'r Ddogfen',
      add: 'Uwchlwytho Dogfen'
    }
  }
}


interface DocumentFormProps {
  onSuccess: () => void;
  existingDocument?: DocumentWithId | null;
}

export function DocumentForm({ onSuccess, existingDocument }: DocumentFormProps) {
  const { language } = useLanguage();
  const t = content[language];
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const form = useForm<z.infer<ReturnType<typeof formSchema>>>({
    resolver: zodResolver(formSchema(t.formSchema)),
    defaultValues: {
      title: existingDocument?.title || '',
      category: existingDocument?.category || '',
      file: existingDocument?.fileUrl || undefined,
    },
  });

  const onSubmit = async (values: z.infer<ReturnType<typeof formSchema>>) => {
    setIsLoading(true);

    try {
      let fileUrl = existingDocument?.fileUrl || '';
      const fileToUpload = values.file instanceof File ? values.file : null;

      if (fileToUpload) {
        setUploadProgress(0);
        if (existingDocument?.fileUrl) {
          await deleteFile(existingDocument.fileUrl);
        }
        fileUrl = await uploadFile(fileToUpload, 'documents', (progress) => {
          setUploadProgress(progress);
        });
        setUploadProgress(100);
      }

      if (!fileUrl) {
        toast(t.toast.fileError);
        setIsLoading(false);
        return;
      }

      const documentData = {
        title: values.title,
        category: values.category,
        fileUrl: fileUrl,
        uploadedAt: existingDocument?.uploadedAt || new Date().toISOString(),
      };

      if (existingDocument) {
        await db.updateDocument(existingDocument.id, documentData);
        toast(t.toast.updateSuccess);
      } else {
        await db.addDocument(documentData);
        toast(t.toast.addSuccess);
      }

      form.reset();
      onSuccess();

    } catch (error) {
      console.error('Error submitting form:', error);
      toast(t.toast.error);
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.titleLabel}</FormLabel>
              <FormControl>
                <Input placeholder={t.titlePlaceholder} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t.categoryLabel}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t.categoryPlaceholder} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {documentCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                {language === 'cy'
                  ? "Mae'r categori yn penderfynu lle mae'r ffeil yn ymddangos (e.e. Gwybodaeth Allweddol > Dyddiadau Tymor)."
                  : "This determines where the file appears (e.g., Key Info > Term Dates)."}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="file"
          render={({ field: { onChange, ...rest } }) => (
            <FormItem>
              <FormLabel>{existingDocument ? t.fileLabel.edit : t.fileLabel.add}</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => onChange(e.target.files?.[0])}
                  {...rest}
                />
              </FormControl>
              <FormDescription>
                {t.fileDesc}
              </FormDescription>
              {uploadProgress !== null && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="w-full mt-2" />
              )}
              {uploadProgress === 100 && (
                <div className="flex items-center text-sm text-green-600 mt-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>{t.uploadComplete}</span>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {existingDocument ? t.submitButton.update : t.submitButton.add}
          </Button>
        </div>
      </form>
    </Form>
  );
}
