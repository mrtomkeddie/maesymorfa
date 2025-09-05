
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, User } from "lucide-react";
import { useLanguage } from "@/app/(public)/LanguageProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState, useEffect } from "react";
import { Session } from "@supabase/supabase-js";
import { Skeleton } from "@/components/ui/skeleton";

const content = {
    en: {
        title: "My Account",
        description: "View your account details and log out.",
        email: "Email Address",
        role: "Account Type",
        roleName: "Parent",
        logout: "Log Out",
        logoutConfirm: "Are you sure you want to log out?"
    },
    cy: {
        title: "Fy Nghyfrif",
        description: "Gweld manylion eich cyfrif ac allgofnodi.",
        email: "Cyfeiriad E-bost",
        role: "Math o Gyfrif",
        roleName: "Rhiant",
        logout: "Allgofnodi",
        logoutConfirm: "Ydych chi'n siŵr eich bod am allgofnodi?"
    }
};


export default function AccountPage() {
    const { language } = useLanguage();
    const t = content[language];
    const router = useRouter();
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const userEmail = session?.user?.email || 'parent@example.com';
    const userName = userEmail.split('@')[0] || 'Parent';
    const userInitials = userName.charAt(0).toUpperCase();

    useEffect(() => {
        if (isSupabaseConfigured) {
            supabase.auth.getSession().then(({ data: { session }}) => {
                setSession(session);
                setIsLoading(false);
            });
        } else {
            setSession({ user: { id: 'parent-1', email: 'parent@example.com' } } as any);
            setIsLoading(false);
        }
    }, [isSupabaseConfigured]);
    

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

            <Card className="max-w-md mx-auto">
                 <CardHeader className="items-center text-center">
                    <Avatar className="h-24 w-24 text-4xl mb-4">
                        <AvatarImage src="https://placehold.co/128x128.png" data-ai-hint="person avatar" />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                     {isLoading ? (
                        <Skeleton className="h-7 w-48" />
                    ) : (
                        <CardTitle className="text-2xl">{userEmail}</CardTitle>
                    )}
                    <CardDescription>{t.roleName}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button 
                        variant="destructive" 
                        className="w-full" 
                        onClick={() => { if(window.confirm(t.logoutConfirm)) handleLogout()}}
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        {t.logout}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

