'use client';

import {
  LayoutDashboard,
  Calendar,
  ClipboardCheck,
  Camera,
  Mail,
  Home,
  User,
  Utensils,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '../(public)/LanguageProvider';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { useIsMobile } from '@/hooks/use-mobile';
import { getAuth, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase/config';
import { PortalShell } from '@/components/layout/PortalShell';

// Exporting LanguageToggle for backward compatibility
export { PortalLanguageToggle as LanguageToggle } from '@/components/layout/PortalShell';

const content = {
  en: {
    title: 'Parent Portal',
    menu: {
      dashboard: 'Dashboard',
      inbox: 'Inbox',
      dinners: 'School Dinners',
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
      dinners: 'Cinio Ysgol',
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

  useEffect(() => {
    if (typeof window !== 'undefined' && 'virtualKeyboard' in navigator) {
      (navigator as any).virtualKeyboard.overlaysContent = true;
    }
  }, []);

  useEffect(() => {
    // DEV MODE: Auto-login
    console.log('Dev Mode: Auto-logging in as Parent');
    setUser({ uid: 'dev-parent', email: 'parent@dev.com' } as FirebaseUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user) {
      const userId = user.uid;
      db.getUnreadMessageCount(userId, 'parent').then(setUnreadCount);
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

  const mobileExtras = showFab ? (
    <Button asChild className="fixed bottom-28 right-4 z-50 h-auto rounded-full shadow-lg gap-2 px-4 py-3">
      <Link href="/absence" aria-label={t.menu.absence}>
        <ClipboardCheck className="h-6 w-6" />
        <span className="font-semibold">{t.menu.absence}</span>
      </Link>
    </Button>
  ) : null;

  return (
    <PortalShell
      title={t.title}
      menuItems={menuItems}
      roleLabel={t.account.role}
      userEmail={user?.email || 'Parent'}
      onLogout={handleLogout}
      isLoading={isLoading}
      mobileExtras={mobileExtras}
    >
      {children}
    </PortalShell>
  );
}
