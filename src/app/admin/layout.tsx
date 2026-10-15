
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
} from '@/components/ui/sidebar';
import { LogOut, Loader2, Megaphone, ExternalLink, Utensils } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { useLanguage } from '../(public)/LanguageProvider';
import { LanguageToggle } from '../(portal)/layout';
import type { User as FirebaseUser } from 'firebase/auth';
import { isFirebaseConfigured, isLocalDemo } from '@/lib/firebase/config';
import { signOutAdmin, watchAdmin } from '@/lib/firebase/auth';
import { ADMIN_HOME, ADMIN_LUNCH_MENU, LIVE_ADMIN_PAGES } from '@/lib/config/features';

const content = {
  en: {
    title: 'School website',
    menu: {
      posts: 'News and dates',
      lunch: 'Lunch menu',
      viewSite: 'View the website',
    },
    account: {
      role: 'Can edit the website',
      logout: 'Sign out'
    }
  },
  cy: {
    title: 'Gwefan yr ysgol',
    menu: {
      posts: 'Newyddion a dyddiadau',
      lunch: 'Bwydlen ginio',
      viewSite: 'Gweld y wefan',
    },
    account: {
      role: "Yn gallu golygu'r wefan",
      logout: 'Allgofnodi'
    }
  }
};


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const t = content[language];

  useEffect(() => {
    if (isLocalDemo) {
      // Local preview with no Firebase project: nothing is saved anywhere, so skip the sign-in
      setUser({ uid: 'dev-admin', email: 'admin@dev.com' } as FirebaseUser);
      setIsLoading(false);
      return;
    }
    if (!isFirebaseConfigured) {
      // Live site with missing Firebase settings: keep the admin area locked
      if (!window.location.pathname.startsWith('/admin/login')) router.replace('/admin/login');
      return;
    }
    // Only signed-in school admins get past this point (see src/lib/firebase/auth.ts)
    return watchAdmin(({ user, admin }) => {
      if (user && admin) {
        setUser(user);
        setIsLoading(false);
        return;
      }
      setUser(null);
      if (user && !admin) signOutAdmin();
      if (!window.location.pathname.startsWith('/admin/login')) router.replace('/admin/login');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo pages (see LIVE_ADMIN_PAGES) are hidden: their addresses lead back to the live page
  const isLivePage = LIVE_ADMIN_PAGES.some((page) => pathname.startsWith(page));
  useEffect(() => {
    if (user && !pathname.startsWith('/admin/login') && !isLivePage) router.replace(ADMIN_HOME);
  }, [user, pathname, isLivePage, router]);

  const handleLogout = async () => {
    if (isFirebaseConfigured) {
      await signOutAdmin();
    }
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    router.push('/');
    router.refresh();
  };

  if (pathname.startsWith('/admin/login')) {
    return <>{children}</>;
  }

  if (isLoading || !user || !isLivePage) {
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
          <Link href={ADMIN_HOME} className="flex items-center gap-2">
            <Image src="/icon.png" alt="School logo" width={28} height={28} className="w-7 h-7" />
            <span className="text-lg font-extrabold tracking-tighter text-foreground group-data-[collapsible=icon]:hidden">
              {t.title}
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="p-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith(ADMIN_HOME)} tooltip={{ children: t.menu.posts }}>
                <Link href={ADMIN_HOME}>
                  <Megaphone />
                  <span>{t.menu.posts}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith(ADMIN_LUNCH_MENU)} tooltip={{ children: t.menu.lunch }}>
                <Link href={ADMIN_LUNCH_MENU}>
                  <Utensils />
                  <span>{t.menu.lunch}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={{ children: t.menu.viewSite }}>
                <a href="/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  <span>{t.menu.viewSite}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-2 flex flex-col gap-2">
          <div className="flex w-full items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center rounded-md">
            <Avatar className="size-8">
              <AvatarFallback>{(user?.email || 'A').charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col text-sm group-data-[collapsible=icon]:hidden flex-grow text-left">
              <span className="truncate font-semibold">{user?.email || 'Admin'}</span>
              <span className="text-muted-foreground">{t.account.role}</span>
            </div>
          </div>
          <SidebarMenuButton variant="outline" onClick={handleLogout} tooltip={{ children: t.account.logout, side: 'right' }}>
            <LogOut />
            <span>{t.account.logout}</span>
          </SidebarMenuButton>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <main className="min-w-0 p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-4">
              <div className="lg:hidden">
                <SidebarTrigger />
              </div>
              <div className="ml-auto">
                <LanguageToggle />
              </div>
            </div>
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
