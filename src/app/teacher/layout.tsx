

'use client';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarFooter,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  LogOut,
  Loader2,
  Send,
  Award,
  Home,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { useLanguage } from '../(public)/LanguageProvider';
import { supabase, getUserRole } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { LanguageToggle } from '../(portal)/layout';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const content = {
  en: {
    title: 'Teacher Portal',
    menu: {
      dashboard: 'My Class',
      outbox: 'Sent Messages',
      values: 'Values Award',
    },
    account: {
        title: 'My Account',
        role: 'Teacher',
        logout: 'Logout'
    }
  },
  cy: {
    title: 'Porth Athrawon',
    menu: {
      dashboard: 'Fy Nosbarth',
      outbox: 'Negeseuon a Anfonwyd',
      values: 'Gwobr Gwerthoedd',
    },
     account: {
        title: 'Fy Nghyfrif',
        role: 'Athro/Athrawes',
        logout: 'Allgofnodi'
    }
  }
};


const BottomNav = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { language } = useLanguage();
    const t = content[language];
     const menuItems = [
        { href: '/teacher/dashboard', label: t.menu.dashboard, icon: Home },
        { href: '/teacher/outbox', label: t.menu.outbox, icon: Send },
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-24 border-t bg-background/95 backdrop-blur-sm lg:hidden">
            <div className="mx-auto flex h-full max-w-md items-center justify-around px-safe pb-safe-bottom">
                {menuItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                          href={item.href}
                          key={item.href}
                          onClick={(e) => {
                              e.preventDefault();
                              router.push(item.href);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-start gap-1 text-xs transition-colors w-16 h-full pt-3 pb-2",
                            isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                          )}
                        >
                            <Icon className="h-6 w-6" />
                            <span className="truncate">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}


export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const t = content[language];
  const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isMobile = useIsMobile();
  const showFab = isMobile && !['/teacher/values-award'].includes(pathname);


  useEffect(() => {
    if (!isSupabaseConfigured) {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const userRole = localStorage.getItem('userRole');
        if (isAuthenticated && userRole === 'teacher') {
            setSession({ user: { id: `${userRole}-1` } } as Session);
        } else {
             if (pathname !== '/teacher/login') {
                router.replace('/teacher/login');
             }
        }
        setIsLoading(false);
        return;
    }
    
    const getSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = await getUserRole(session.user.id);
        if (role === 'teacher') {
          setSession(session);
        } else {
          await supabase.auth.signOut();
          router.replace('/teacher/login');
        }
      } else {
         if (pathname !== '/teacher/login') {
            router.replace('/teacher/login');
         }
      }
      setIsLoading(false);
    };

    getSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          router.replace('/teacher/login');
        } else if (newSession) {
           getSessionAndRole();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname, isSupabaseConfigured]);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            return;
        }
    }
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    router.push('/teacher/login');
    router.refresh();
  };

  const menuItems = [
    { href: '/teacher/dashboard', label: t.menu.dashboard, icon: LayoutDashboard },
    { href: '/teacher/outbox', label: t.menu.outbox, icon: Send },
    { href: '/teacher/values-award', label: t.menu.values, icon: Award },
  ];
  
  if (pathname.startsWith('/teacher/login')) {
    return <>{children}</>;
  }

  if (isLoading || !session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
      <SidebarProvider>
        <Sidebar variant="inset" collapsible="icon">
          <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
            <Link href="/teacher/dashboard" className="flex items-center gap-2">
              <Image src="/icon.png" alt="School logo" width={28} height={28} className="w-7 h-7" />
              <span className="text-lg font-extrabold tracking-tighter text-foreground group-data-[collapsible=icon]:hidden">
                {t.title}
              </span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="p-2">
               {menuItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.href)}
                        tooltip={{ children: item.label }}
                    >
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 flex flex-col gap-2">
            <div className="flex w-full items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center rounded-md">
                <Avatar className="size-8">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="person avatar" />
                    <AvatarFallback>T</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden flex-grow text-left">
                    <span className="font-semibold">{session.user?.email || 'Teacher'}</span>
                    <span className="text-muted-foreground">{t.account.role}</span>
                </div>
            </div>
             <SidebarMenuButton variant="outline" onClick={handleLogout} tooltip={{ children: t.account.logout, side: 'right' }}>
                <LogOut />
                <span>{t.account.logout}</span>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
           <div className="flex flex-col min-h-screen">
             <main className="flex-grow p-4 md:p-6 lg:p-8 pb-28 lg:pb-8">
              <div className="mx-auto max-w-7xl">
                <div className="flex justify-between items-center mb-4">
                    <div className="lg:hidden">
                        {!isMobile && <SidebarTrigger />}
                    </div>
                    <div className="ml-auto">
                        <LanguageToggle />
                    </div>
                </div>
                {children}
              </div>
            </main>
            {isMobile && (
                <>
                  <BottomNav />
                   {showFab && (
                      <Button asChild className="fixed bottom-28 right-4 z-50 h-auto rounded-full shadow-lg gap-2 px-4 py-3">
                          <Link href="/teacher/values-award" aria-label={t.menu.values}>
                              <Award className="h-6 w-6" />
                              <span className="font-semibold">{t.menu.values}</span>
                          </Link>
                      </Button>
                   )}
                </>
            )}
           </div>
        </SidebarInset>
      </SidebarProvider>
  );
}
