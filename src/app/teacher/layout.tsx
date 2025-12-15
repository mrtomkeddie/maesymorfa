'use client';

import {
  LayoutDashboard,
  Send,
  Award,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLanguage } from '../(public)/LanguageProvider';
import { PortalShell } from '@/components/layout/PortalShell';
import { getAuth, onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase/config';

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


export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { language } = useLanguage();
  const t = content[language];
  const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  useEffect(() => {
    // DEV MODE: Auto-login
    console.log('Dev Mode: Auto-logging in as Teacher');
    setUser({ uid: 'dev-teacher', email: 'teacher@dev.com' } as any);
    setIsLoading(false);
  }, []);

  const handleLogout = async () => {
    if (isFirebaseConfigured) {
      const auth = getAuth(app);
      await signOut(auth);
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

  return (
    <PortalShell
      title={t.title}
      menuItems={menuItems}
      roleLabel={t.account.role}
      userEmail={user?.email || 'Teacher'}
      onLogout={handleLogout}
      isLoading={isLoading || (!user && !pathname.startsWith('/teacher/login'))}
    >
      {children}
    </PortalShell>
  );
}
