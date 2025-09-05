

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Utensils, ArrowRight, UserCheck, Percent, Pizza, Salad, Loader2, Bell, Megaphone, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { parentChildren } from '@/lib/mockData';
import { useEffect, useState, Suspense } from 'react';
import { db } from '@/lib/db';
import type { DailyMenu, WeeklyMenu, ParentNotificationWithId } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { LanguageToggle } from '../layout';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { cy, enGB } from 'date-fns/locale';
import dynamic from 'next/dynamic';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const content = {
  en: {
    welcome: "Welcome back, Jane!",
    description: "Here's what's happening at Maes Y Morfa today.",
    notifications: "Recent Notifications",
    children: "My Children",
    attendance: "Attendance",
    teacher: "Teacher",
    awards: "Values Awards",
    actions: "Quick Actions",
    reportAbsence: "Report an Absence",
    lunch: "Today's Lunch",
    lunchDesc: "A sample of what's on the menu today.",
    lunchMain: "Main",
    lunchAlt: "Vegetarian / Alt",
    lunchDessert: "Dessert",
    viewMenu: "View Full Menu",
    menuTitle: "This Week's Lunch Menu",
    menuDesc: "Here's what's on offer for lunch this week at Maes Y Morfa.",
    day: "Day",
    mainCourse: "Main Course",
    vegAlt: "Vegetarian / Alt",
    dessertCourse: "Dessert",
    notAvailable: "Not available",
    notAvailableToday: "Not available today",
    loading: "Loading...",
  },
  cy: {
    welcome: "Croeso'n ôl, Jane!",
    description: "Dyma beth sy'n digwydd ym Maes Y Morfa heddiw.",
    notifications: "Hysbysiadau Diweddar",
    children: "Fy Mhlant",
    attendance: "Presenoldeb",
    teacher: "Athro/Athrawes",
    awards: "Gwobrau Gwerthoedd",
    actions: "Gweithredoedd Cyflym",
    reportAbsence: "Riportio Absenoldeb",
    lunch: "Cinio Heddiw",
    lunchDesc: "Sampl o'r hyn sydd ar y fwydlen heddiw.",
    lunchMain: "Prif Gwrs",
    lunchAlt: "Llysieuol / Amgen",
    lunchDessert: "Pwdin",
    viewMenu: "Gweld y Fwydlen Lawn",
    menuTitle: "Bwydlen Ginio'r Wythnos Hon",
    menuDesc: "Dyma beth sydd ar gael amser cinio'r wythnos hon ym Maes Y Morfa.",
    day: "Diwrnod",
    mainCourse: "Prif Gwrs",
    vegAlt: "Llysieuol / Amgen",
    dessertCourse: "Pwdin",
    notAvailable: "Dim ar gael",
    notAvailableToday: "Dim ar gael heddiw",
    loading: "Yn llwytho...",
  }
};

const LoadingMenuComponent = () => (
    <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

const MenuDialogContent = dynamic(() => import('@/components/portal/MenuDialogContent'), {
  loading: () => <LoadingMenuComponent />,
});

const MenuDrawerContent = dynamic(() => import('@/components/portal/MenuDrawerContent'), {
  loading: () => <LoadingMenuComponent />,
});

function DashboardContent() {
  const [todayMenu, setTodayMenu] = useState<DailyMenu | null>(null);
  const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [notifications, setNotifications] = useState<ParentNotificationWithId[]>([]);
  const [awardCounts, setAwardCounts] = useState<Record<string, number>>({});
  const isMobile = useIsMobile();
  const parentId = 'parent-1'; // This would be dynamic in a real app
  const { language } = useLanguage();
  const t = content[language];
  const locale = language === 'cy' ? cy : enGB;


  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const fullMenu = await db.getWeeklyMenu();
        if (fullMenu) {
            setWeeklyMenu(fullMenu);
            const today = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
            const currentDayMenu = fullMenu[today] || { main: t.notAvailableToday, alt: t.notAvailableToday, dessert: t.notAvailableToday };
            setTodayMenu(currentDayMenu);
        } else {
             setTodayMenu({ main: t.notAvailable, alt: t.notAvailable, dessert: t.notAvailable });
        }
      } catch (error) {
        console.error("Failed to fetch lunch menu", error);
        setTodayMenu({ main: t.notAvailable, alt: t.notAvailable, dessert: t.notAvailable });
      } finally {
        setIsLoadingMenu(false);
      }
    };

    const fetchNotifications = async () => {
        const fetchedNotifications = await db.getNotificationsForParent(parentId);
        setNotifications(fetchedNotifications);
    };
    
    const fetchAwardCounts = async () => {
        const counts: Record<string, number> = {};
        for (const child of parentChildren) {
            const count = await db.getValuesAwardCount(child.id);
            counts[child.id] = count;
        }
        setAwardCounts(counts);
    };

    fetchMenu();
    fetchNotifications();
    fetchAwardCounts();
  }, [parentId, t.notAvailable, t.notAvailableToday]);
 
  const notificationIcons = {
    'Achievement': <Trophy className="h-6 w-6 text-yellow-500" />,
    'Incident': <Megaphone className="h-6 w-6 text-red-500" />,
    'General': <Bell className="h-6 w-6 text-blue-500" />,
    'Values Award': <Trophy className="h-6 w-6 text-yellow-500" />
  }

  return (
    <>
       <Card className="lg:hidden mb-6">
        <CardHeader>
            <CardTitle>{t.actions}</CardTitle>
        </CardHeader>
        <CardContent>
            <Button asChild className="w-full justify-start">
            <Link href="/absence"><ClipboardCheck className="mr-2 h-4 w-4" /> {t.reportAbsence}</Link>
            </Button>
        </CardContent>
        </Card>
      
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        
        <div className="lg:col-span-2 space-y-6">
            
            {notifications.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>{t.notifications}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {notifications.slice(0, 3).map(notif => (
                            <div key={notif.id} className="flex items-start gap-4 p-4 rounded-lg border">
                                <div className="mt-1">{notificationIcons[notif.type]}</div>
                                <div>
                                    <p className="font-semibold">{notif.childName}: {notif.type}</p>
                                    <p className="text-sm text-muted-foreground">{notif.notes}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(notif.date), { addSuffix: true, locale })} from {notif.teacherName}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>{t.children}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {parentChildren.map(child => (
                        <div key={child.id} className="flex items-center gap-4 rounded-lg border p-4">
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">{child.name}</h3>
                                    <p className="text-sm text-muted-foreground">{child.yearGroup}</p>
                                </div>
                                <div className="space-y-2">
                                     <div className="flex items-center gap-2 text-sm">
                                        <Percent className="h-4 w-4 text-primary" />
                                        <span>{t.attendance}: <strong>{child.attendance}</strong></span>
                                     </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <UserCheck className="h-4 w-4 text-primary" />
                                        <span>{t.teacher}: <strong>{child.teacher}</strong></span>
                                     </div>
                                      <div className="flex items-center gap-2 text-sm">
                                        <Trophy className="h-4 w-4 text-primary" />
                                        <span>{t.awards}: <strong>{awardCounts[child.id] ?? t.loading}</strong></span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="hidden lg:block">
            <CardHeader>
              <CardTitle>{t.actions}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full justify-start">
                <Link href="/absence"><ClipboardCheck className="mr-2 h-4 w-4" /> {t.reportAbsence}</Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    <span>{t.lunch}</span>
                </CardTitle>
                <CardDescription>{t.lunchDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingMenu ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-2/3" />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                      <Pizza className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                          <h4 className="font-semibold text-sm">{t.lunchMain}</h4>
                          <p className="text-sm text-muted-foreground">{todayMenu?.main}</p>
                      </div>
                  </div>
                   <div className="flex items-start gap-3">
                      <Salad className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                          <h4 className="font-semibold text-sm">{t.lunchAlt}</h4>
                          <p className="text-sm text-muted-foreground">{todayMenu?.alt}</p>
                      </div>
                  </div>
                  <div className="flex items-start gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mt-0.5 shrink-0 h-5 w-5"><path d="M11 15.54c-2.31-1.39-3-4.24-3-6.54C8 5.42 9.79 3 12 3s4 2.42 4 6c0 2.3-1.02 5.15-3 6.54"/><path d="M12 21a6.5 6.5 0 0 0 6.5-6.5H12v6.5Z"/><path d="M12 21a6.5 6.5 0 0 1-6.5-6.5H12v6.5Z"/><path d="M12 3v18"/></svg>
                      <div>
                          <h4 className="font-semibold text-sm">{t.lunchDessert}</h4>
                          <p className="text-sm text-muted-foreground">{todayMenu?.dessert}</p>
                      </div>
                  </div>
                </>
              )}
                <div className="pt-2">
                    {isMobile ? (
                        <Drawer>
                            <DrawerTrigger asChild>
                                <Button variant="secondary" className="w-full justify-start">
                                    <Utensils className="mr-2 h-4 w-4" /> {t.viewMenu}
                                </Button>
                            </DrawerTrigger>
                            <DrawerContent>
                               <DrawerHeader className="text-left">
                                    <DrawerTitle>{t.menuTitle}</DrawerTitle>
                                    <DrawerDescription>{t.menuDesc}</DrawerDescription>
                                </DrawerHeader>
                                <MenuDrawerContent weeklyMenu={weeklyMenu} isLoadingMenu={isLoadingMenu} t={t} days={days} />
                            </DrawerContent>
                        </Drawer>
                    ) : (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="secondary" className="w-full justify-start">
                                    <Utensils className="mr-2 h-4 w-4" /> {t.viewMenu}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-3xl">
                                <MenuDialogContent weeklyMenu={weeklyMenu} isLoadingMenu={isLoadingMenu} t={t} days={days} />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
          </Card>

        </div>

      </div>
    </>
  );
}

const DashboardSkeleton = () => (
    <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-80" />
            </div>
            <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <Card>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent><Skeleton className="h-10 w-full" /></CardContent>
                </Card>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-8 w-3/4" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-2/3" />
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
);


export default function DashboardPage() {
    const { language } = useLanguage();
    const t = content[language];
    
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-headline">{t.welcome}</h1>
                    <p className="text-muted-foreground">{t.description}</p>
                </div>
                <LanguageToggle />
            </div>
            <Suspense fallback={<DashboardSkeleton />}>
                <DashboardContent />
            </Suspense>
        </div>
    );
}
