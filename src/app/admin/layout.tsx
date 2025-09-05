

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
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarSeparator,
  useSidebar,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Newspaper,
  Calendar,
  Users,
  FileText,
  LogOut,
  Loader2,
  Users2,
  BookUser,
  HelpCircle,
  Settings,
  Mail,
  Camera,
  Utensils,
  Megaphone,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { db } from '@/lib/db';
import { useLanguage } from '../(public)/LanguageProvider';
import { Button } from '@/components/ui/button';
import { supabase, getUserRole } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { LanguageToggle } from '../(portal)/layout';

const content = {
  en: {
    title: 'Admin Portal',
    menu: {
      dashboard: 'Dashboard',
      inbox: 'Inbox',
    },
    groups: {
        content: 'Content',
        users: 'Users',
        system: 'System',
    },
    contentManagement: {
      announcements: 'Announcements',
      staff: 'Staff',
      gallery: 'Photo Gallery',
      documents: 'Documents',
      menu: 'Lunch Menu',
    },
    userManagement: {
      parents: 'Parents',
      children: 'Children',
      allUsers: 'All Users'
    },
    settings: {
      site: 'Site Settings',
    },
    account: {
        title: 'My Account',
        role: 'Administrator',
        logout: 'Logout'
    }
  },
  cy: {
    title: 'Porth Gweinyddu',
    menu: {
      dashboard: 'Dangosfwrdd',
      inbox: 'Mewnflwch',
    },
    groups: {
        content: 'Cynnwys',
        users: 'Defnyddwyr',
        system: 'System',
    },
    contentManagement: {
      announcements: 'Cyhoeddiadau',
      staff: 'Staff',
      gallery: 'Oriel Ffotograffau',
      documents: 'Dogfennau',
      menu: 'Bwydlen Ginio',
    },
    userManagement: {
      parents: 'Rhieni',
      children: 'Plant',
      allUsers: 'Holl Ddefnyddwyr'
    },
    settings: {
      site: 'Gosodiadau Gwefan',
    },
     account: {
        title: 'Fy Nghyfrif',
        role: 'Gweinyddwr',
        logout: 'Allgofnodi'
    }
  }
};


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { language } = useLanguage();
  const t = content[language];
  const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


  useEffect(() => {
    if (!isSupabaseConfigured) {
        const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
        const userRole = localStorage.getItem('userRole');
        if (isAuthenticated && userRole === 'admin') {
            setSession({ user: { id: `${userRole}-1` } } as Session);
        } else {
             if (pathname !== '/admin/login') {
                router.replace('/admin/login');
             }
        }
        setIsLoading(false);
        return;
    }
    
    const getSessionAndRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const role = await getUserRole(session.user.id);
        if (role === 'admin') {
          setSession(session);
        } else {
          // If logged in but not an admin, log out and redirect to admin login
          await supabase.auth.signOut();
          router.replace('/admin/login');
        }
      } else {
         if (pathname !== '/admin/login') {
            router.replace('/admin/login');
         }
      }
      setIsLoading(false);
    };

    getSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          router.replace('/admin/login');
        } else if (newSession) {
           getSessionAndRole();
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname, isSupabaseConfigured]);

  useEffect(() => {
    if (session) {
      const userId = session.user.id;
      db.getUnreadMessageCount(userId, 'admin').then(setUnreadCount);
    }
  }, [session, pathname]); // Refetch on path change to update badge

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error logging out:', error);
            return;
        }
    }
    // For both Supabase and mock, clear local storage and redirect
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userRole');
    router.push('/admin/login');
    router.refresh();
  };

  const menuItems = [
    { href: '/admin/dashboard', label: t.menu.dashboard, icon: LayoutDashboard },
    { href: '/admin/inbox', label: t.menu.inbox, icon: Mail, badge: unreadCount },
  ];

  const contentManagementItems = [
    { href: '/admin/announcements', label: t.contentManagement.announcements, icon: Megaphone },
    { href: '/admin/staff', label: t.contentManagement.staff, icon: Users },
    { href: '/admin/gallery', label: t.contentManagement.gallery, icon: Camera },
    { href: '/admin/documents', label: t.contentManagement.documents, icon: FileText },
    { href: '/admin/menu', label: t.contentManagement.menu, icon: Utensils },
  ];

  const userManagementItems = [
      { href: '/admin/parents', label: t.userManagement.parents, icon: Users2 },
      { href: '/admin/children', label: t.userManagement.children, icon: BookUser },
      { href: '/admin/users', label: t.userManagement.allUsers, icon: Users },
  ];
  
  const settingsItems = [
    { href: '/admin/settings', label: t.settings.site, icon: Settings },
    // { href: '/admin/help', label: 'Help', icon: HelpCircle },
  ];

  if (pathname.startsWith('/admin/login')) {
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
            <Link href="/admin/dashboard" className="flex items-center gap-2">
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
                        isActive={pathname === item.href}
                        tooltip={{ children: item.label }}
                    >
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                            {item.badge && item.badge > 0 ? <SidebarMenuBadge>{item.badge}</SidebarMenuBadge> : null}
                        </Link>
                    </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
              <SidebarSeparator />
              <SidebarGroup>
                <SidebarGroupLabel>{t.groups.content}</SidebarGroupLabel>
                <SidebarGroupContent>
                    {contentManagementItems.map((item) => (
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
                </SidebarGroupContent>
              </SidebarGroup>
              <SidebarSeparator />
               <SidebarGroup>
                <SidebarGroupLabel>{t.groups.users}</SidebarGroupLabel>
                 <SidebarGroupContent>
                    {userManagementItems.map((item) => (
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
                 </SidebarGroupContent>
               </SidebarGroup>
                <SidebarSeparator />
                 <SidebarGroup>
                    <SidebarGroupLabel>{t.groups.system}</SidebarGroupLabel>
                    <SidebarGroupContent>
                        {settingsItems.map((item) => (
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
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="p-2 flex flex-col gap-2">
            <div className="flex w-full items-center gap-3 p-2 group-data-[collapsible=icon]:justify-center rounded-md">
                <Avatar className="size-8">
                    <AvatarImage src="https://placehold.co/40x40.png" data-ai-hint="person avatar" />
                    <AvatarFallback>A</AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden flex-grow text-left">
                    <span className="font-semibold">{session.user?.email || 'Admin'}</span>
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
          <main className="p-4 md:p-6 lg:p-8">
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
