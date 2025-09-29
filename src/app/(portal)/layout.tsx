
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
  SidebarMenuBadge,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  LogOut,
  Loader2,
  Camera,
  Mail,
  Home,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '../(public)/LanguageProvider';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { getAuth, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase/config';


export const LanguageToggle = () => {
    const { language, setLanguage } = useLanguage();
    const [isPending, startTransition] = useTransition();

    const content = {
        en: { lang1: 'Cymraeg', lang2: 'English' },
        cy: { lang1: 'Cymraeg', lang2: 'English' }
    };
    const t = content[language];
    
    const handleLanguageChange = (newLang: 'en' | 'cy') => {
        startTransition(() => {
            setLanguage(newLang);
        });
    };

    return (
        <div className="flex items-center gap-1 border rounded-full p-1 text-sm bg-background">
            <Button variant={language === 'cy' ? 'default' : 'ghost'} size="sm" className={`rounded-full px-3 py-1 h-auto text-xs portal-lang-toggle ${language === 'cy' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => handleLanguageChange('cy')} disabled={isPending}>{t.lang1}</Button>
            <div className="w-px h-4 bg-border"></div>
            <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" className={`rounded-full px-3 py-1 h-auto text-xs portal-lang-toggle ${language === 'en' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => handleLanguageChange('en')} disabled={isPending}>{t.lang2}</Button>
        </div>
    )
}

const content = {
  en: {
    title: 'Parent Portal',
    menu: {
      dashboard: 'Dashboard',
      inbox: 'Inbox',
      calendar: 'Calendar',
      gallery: 'Photo Gallery',
      absence: 'Report Absence',
      account: 'Account'
    },
    account: {
      title: 'My Account',
      logout: 'Logout',
      role: 'Parent',
    }
  },
  cy: {
    title: 'Porth Rieni',
    menu: {
      dashboard: 'Dangosfwrdd',
      inbox: 'Mewnflwch',
      calendar: 'Calendr',
      gallery: 'Oriel',
      absence: 'Riportio Absenoldeb',
      account: 'Fy Nghyfrif'
    },
    account: {
      title: 'Fy Nghyfrif',
      logout: 'Allgofnodi',
      role: 'Rhiant',
    }
  }
};


const BottomNav = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { language } = useLanguage();
    const t = content[language];

     const menuItems = [
        { href: '/dashboard', label: t.menu.dashboard, icon: Home },
        { href: '/inbox', label: t.menu.inbox, icon: Mail },
        { href: '/calendar', label: t.menu.calendar, icon: Calendar },
        { href: '/gallery', label: t.menu.gallery, icon: Camera },
        { href: '/account', label: t.menu.account, icon: User },
    ];
    return (
        <nav 
            className="fixed bottom-0 left-0 right-0 z-50 h-24 border-t bg-background/95 backdrop-blur-sm lg:hidden transition-transform duration-200"
            style={{ transform: 'translateY(calc(var(--keyboard-height, 0px) * -1))' }}
        >
            <div className="mx-auto flex h-full max-w-md items-center justify-around px-safe pb-[env(safe-area-inset-bottom)]">
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


export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { language } = useLanguage();
  const t = content[language];
  const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const isMobile = useIsMobile();
  const showFab = isMobile && !['/absence', '/account'].includes(pathname);
  useKeyboardHeight(); 

  useEffect(() => {
    if (typeof window !== 'undefined' && 'virtualKeyboard' in navigator) {
        (navigator as any).virtualKeyboard.overlaysContent = true;
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        if (isAuthenticated) {
            setUser({ uid: 'parent-1' } as FirebaseUser);
        } else {
             router.replace('/login');
        }
        setIsLoading(false);
        return;
    }
    
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // Here you would typically get a custom claim to verify the user is a 'parent'
        setUser(user);
      } else {
        router.replace('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router, isFirebaseConfigured]);
  
  useEffect(() => {
    if (user) {
      const userId = user.uid;
      db.getUnreadMessageCount(userId, 'parent').then(setUnreadCount);
      // Optional: Set up a listener for real-time subscriptions if using Firestore subscriptions
    }
  }, [user, pathname]);


  const handleLogout = async () => {
    if (isFirebaseConfigured) {
        const auth = getAuth(app);
        await signOut(auth);
    }
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    router.push('/login');
    router.refresh();
  };

  const menuItems = [
    { href: '/dashboard', label: t.menu.dashboard, icon: LayoutDashboard },
    { href: '/inbox', label: t.menu.inbox, icon: Mail, badge: unreadCount },
    { href: '/calendar', label: t.menu.calendar, icon: Calendar },
    { href: '/gallery', label: t.menu.gallery, icon: Camera },
    { href: '/absence', label: t.menu.absence, icon: ClipboardCheck },
    { href: '/account', label: t.menu.account, icon: User },
  ];
  
  if (isLoading || !user) {
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
            <Link href="/dashboard" className="flex items-center gap-2">
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
                      {item.badge && item.badge > 0 ? (
                        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                      ): null}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 flex flex-col gap-2">
            <SidebarMenuButton variant="outline" onClick={handleLogout} tooltip={{ children: t.account.logout, side: 'right' }}>
                <LogOut />
                <span>{t.account.logout}</span>
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
           <div className="flex flex-col min-h-screen">
            <main className="flex-grow p-4 md:p-6 lg:p-8 pb-32 lg:pb-8">
              <div className="mx-auto max-w-7xl">
                <div className="hidden lg:flex justify-end mb-4">
                    <LanguageToggle />
                </div>
                <div className="flex lg:hidden justify-between items-center mb-4">
                    <div className="lg:hidden">
                        {!isMobile && <SidebarTrigger />}
                    </div>
                    <LanguageToggle />
                </div>
                {children}
              </div>
            </main>
            {isMobile && (
                <>
                  <BottomNav />
                   {showFab && (
                      <Button asChild className="fixed bottom-28 right-4 z-50 h-auto rounded-full shadow-lg gap-2 px-4 py-3">
                          <Link href="/absence" aria-label={t.menu.absence}>
                              <ClipboardCheck className="h-6 w-6" />
                              <span className="font-semibold">{t.menu.absence}</span>
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
