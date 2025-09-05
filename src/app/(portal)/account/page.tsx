
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User, Save, Upload } from "lucide-react";
import { useLanguage } from "@/app/(public)/LanguageProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useRef } from "react";
import { Session } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { db } from "@/lib/db";
import type { Parent, ParentWithId } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { uploadFile } from "@/lib/firebase/storage";


const profileFormSchema = (t: any) => z.object({
  name: z.string().min(2, { message: t.form.name_message }),
  email: z.string().email({ message: t.form.email_message }),
  phone: z.string().optional(),
  avatar: z.any().optional(),
});

const content = {
    en: {
        title: "My Account",
        description: "View and update your account details.",
        email: "Email Address",
        role: "Account Type",
        roleName: "Parent",
        logout: "Log Out",
        logoutConfirm: "Are you sure you want to log out?",
        form: {
            title: "Your Details",
            nameLabel: "Full Name",
            emailLabel: "Email Address",
            phoneLabel: "Phone Number (Optional)",
            avatarLabel: "Profile Picture",
            saveButton: "Save Changes",
            name_message: 'Name must be at least 2 characters.',
            email_message: 'Please enter a valid email address.',
        },
        toast: {
            success: { title: "Profile Updated", description: "Your details have been saved successfully." },
            error: { title: "Update Failed", description: "Could not save your details. Please try again." },
        }
    },
    cy: {
        title: "Fy Nghyfrif",
        description: "Gweld a diweddaru manylion eich cyfrif.",
        email: "Cyfeiriad E-bost",
        role: "Math o Gyfrif",
        roleName: "Rhiant",
        logout: "Allgofnodi",
        logoutConfirm: "Ydych chi'n siŵr eich bod am allgofnodi?",
        form: {
            title: "Eich Manylion",
            nameLabel: "Enw Llawn",
            emailLabel: "Cyfeiriad E-bost",
            phoneLabel: "Rhif Ffôn (Dewisol)",
            avatarLabel: "Llun Proffil",
            saveButton: "Cadw Newidiadau",
            name_message: 'Rhaid i\'r enw fod o leiaf 2 nod.',
            email_message: 'Rhowch gyfeiriad e-bost dilys.',
        },
        toast: {
            success: { title: "Proffil wedi'i Ddiweddaru", description: "Mae eich manylion wedi'u gadw'n llwyddiannus." },
            error: { title: "Methwyd Diweddaru", description: "Ni ellid cadw eich manylion. Rhowch gynnig arall arni." },
        }
    }
};


export default function AccountPage() {
    const { language } = useLanguage();
    const t = content[language];
    const router = useRouter();
    const { toast } = useToast();
    const [session, setSession] = useState<Session | null>(null);
    const [parent, setParent] = useState<ParentWithId | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    const userEmail = session?.user?.email || 'parent@example.com';
    const userName = parent?.name || userEmail.split('@')[0] || 'Parent';
    const userInitials = userName.charAt(0).toUpperCase();

    const form = useForm<z.infer<ReturnType<typeof profileFormSchema>>>({
        resolver: zodResolver(profileFormSchema(t)),
        defaultValues: { name: '', email: '', phone: '' },
    });

    useEffect(() => {
        const fetchUserData = async () => {
            setIsLoading(true);
            let currentSession: Session | null = null;
            
            if (isSupabaseConfigured) {
                const { data: { session } } = await supabase.auth.getSession();
                currentSession = session;
            } else {
                currentSession = { user: { id: 'parent-1', email: 'parent@example.com' } } as any;
            }

            setSession(currentSession);

            if (currentSession?.user.id) {
                try {
                    const parentData = await db.getParentById(currentSession.user.id);
                    if (parentData) {
                        setParent(parentData);
                        form.reset({
                            name: parentData.name || '',
                            email: parentData.email || '',
                            phone: parentData.phone || '',
                        });
                    }
                } catch(e) {
                     console.error("Failed to fetch parent profile", e);
                }
            }
            setIsLoading(false);
        };
        fetchUserData();
    }, [isSupabaseConfigured, form]);
    
    async function onSubmit(values: z.infer<ReturnType<typeof profileFormSchema>>) {
        if (!parent) return;
        setIsSaving(true);
        setUploadProgress(null);
        try {
            let avatarUrl = parent.avatarUrl;
            if (values.avatar && values.avatar instanceof File) {
                 setUploadProgress(0);
                 avatarUrl = await uploadFile(values.avatar, `avatars/${parent.id}`, (progress) => {
                    setUploadProgress(progress);
                 });
                 setUploadProgress(100);
            }

            const updateData: Partial<Parent> = {
                name: values.name,
                email: values.email,
                phone: values.phone,
                avatarUrl: avatarUrl,
            };
            await db.updateParent(parent.id, updateData);
            toast(t.toast.success);
            setParent(prev => prev ? { ...prev, ...updateData } : null);
            form.setValue('avatar', null); // Reset file input
        } catch (error) {
            console.error("Failed to update profile", error);
            toast(t.toast.error);
        } finally {
            setIsSaving(false);
            setTimeout(() => setUploadProgress(null), 2000);
        }
    }

    const handleLogout = async () => {
        if (isSupabaseConfigured) {
            await supabase.auth.signOut();
        }
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
                <p className="text-muted-foreground">
                    {t.description}
                </p>
                </div>
            </div>

            <Card className="max-w-2xl mx-auto">
                 <CardHeader className="items-center text-center">
                    <Avatar className="h-24 w-24 text-4xl mb-4">
                        <AvatarImage src={parent?.avatarUrl} data-ai-hint="person avatar" />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                     {isLoading ? (
                        <Skeleton className="h-7 w-48" />
                    ) : (
                        <CardTitle className="text-2xl">{userName}</CardTitle>
                    )}
                    <CardDescription>{t.roleName}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                         <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <CardTitle className="text-lg">{t.form.title}</CardTitle>
                             <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.form.nameLabel}</FormLabel>
                                    <FormControl>
                                    <Input {...field} disabled={isLoading || isSaving} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.form.emailLabel}</FormLabel>
                                    <FormControl>
                                    <Input type="email" {...field} disabled={isLoading || isSaving} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                              <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.form.phoneLabel}</FormLabel>
                                    <FormControl>
                                    <Input type="tel" {...field} disabled={isLoading || isSaving} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="avatar"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t.form.avatarLabel}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input 
                                                type="file" 
                                                accept="image/png, image/jpeg, image/webp" 
                                                className="pl-12" 
                                                onChange={(e) => field.onChange(e.target.files && e.target.files[0])}
                                                disabled={isLoading || isSaving}
                                            />
                                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                                <Upload className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                 <Button type="submit" disabled={isLoading || isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    {t.form.saveButton}
                                </Button>
                            </div>
                         </form>
                    </Form>
                     <div className="mt-8 border-t pt-6">
                        <Button 
                            variant="destructive" 
                            className="w-full" 
                            onClick={() => { if(window.confirm(t.logoutConfirm)) handleLogout()}}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            {t.logout}
                        </Button>
                     </div>
                </CardContent>
            </Card>
        </div>
    );
}
