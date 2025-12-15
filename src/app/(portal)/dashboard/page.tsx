

'use client';

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardCheck, Utensils, ArrowRight, UserCheck, Percent, Pizza, Salad, Loader2, Bell, Megaphone, Trophy, CreditCard, ChevronDown, ChevronUp, Zap } from 'lucide-react';
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
        reportAbsence: "Report Absence",
        calendar: "Calendar",
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
        calendar: "Calendr",
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

// Helper for notification styling
const getNotificationStyle = (type: string) => {
    switch (type) {
        case 'Achievement': return 'border-l-4 border-l-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10';
        case 'Values Award': return 'border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10';
        case 'Incident': return 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-900/10';
        default: return 'border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-900/10';
    }
};

function DashboardContent() {
    const [todayMenu, setTodayMenu] = useState<DailyMenu | null>(null);
    const [weeklyMenu, setWeeklyMenu] = useState<WeeklyMenu | null>(null);
    const [isLoadingMenu, setIsLoadingMenu] = useState(true);
    const [notifications, setNotifications] = useState<ParentNotificationWithId[]>([]);
    const [awardCounts, setAwardCounts] = useState<Record<string, number>>({});
    const isMobile = useIsMobile();
    const parentId = 'parent-1';
    const { language } = useLanguage();
    const t = content[language];
    const [showAllNotifications, setShowAllNotifications] = useState(false);
    const locale = language === 'cy' ? cy : enGB;

    // Header Date
    const todayDate = new Date().toLocaleDateString(language === 'cy' ? 'cy' : 'en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });


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
        'Achievement': <Trophy className="h-5 w-5 text-yellow-500" />,
        'Incident': <Megaphone className="h-5 w-5 text-red-500" />,
        'General': <Bell className="h-5 w-5 text-blue-500" />,
        'Values Award': <Trophy className="h-5 w-5 text-amber-500" />
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground font-headline mb-1">{t.welcome}</h1>
                    <p className="text-muted-foreground text-lg">{todayDate}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

                {/* Main Column (Notifications & Children) */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Notifications Feed */}
                    {notifications.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Bell className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold">{t.notifications}</h2>
                            </div>
                            <div className="space-y-3">
                                {notifications.slice(0, showAllNotifications ? undefined : 4).map(notif => (
                                    <div key={notif.id} className={`flex items-start gap-4 p-4 rounded-xl shadow-sm bg-card border border-border/50 hover:shadow-md transition-all ${getNotificationStyle(notif.type)}`}>
                                        <div className="mt-0.5 p-2 bg-background rounded-full shadow-sm shrink-0">
                                            {notificationIcons[notif.type] || <Bell className="h-4 w-4 text-gray-500" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-base">{notif.childName}: {notif.type}</h3>
                                                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap ml-2">
                                                    {formatDistanceToNow(new Date(notif.date), { addSuffix: true, locale })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{notif.notes}</p>
                                            <p className="text-xs text-muted-foreground mt-2 font-medium">From: {notif.teacherName}</p>
                                        </div>
                                    </div>
                                ))}

                                {notifications.length > 4 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full mt-2 text-muted-foreground hover:text-primary"
                                        onClick={() => setShowAllNotifications(!showAllNotifications)}
                                    >
                                        {showAllNotifications ? (
                                            <><ChevronUp className="mr-2 h-4 w-4" /> Show Less</>
                                        ) : (
                                            <><ChevronDown className="mr-2 h-4 w-4" /> See More</>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </section>
                    )}

                    {/* My Children Cards */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <UserCheck className="h-5 w-5 text-primary" />
                            <h2 className="text-xl font-bold">{t.children}</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {parentChildren.map(child => (
                                <div key={child.id} className="group relative overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300">
                                    {/* Card Header Background Strip */}
                                    <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-primary/60" />

                                    <div className="p-6 pt-8">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-14 w-14 ring-2 ring-background shadow-md">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                                                        {child.name.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <h3 className="font-bold text-xl leading-none mb-1 group-hover:text-primary transition-colors">{child.name}</h3>
                                                    <p className="text-sm text-muted-foreground font-medium">{child.yearGroup}</p>
                                                </div>
                                            </div>
                                            {/* Attendance Badge */}
                                            <div className="flex flex-col items-end">
                                                <div className="text-2xl font-black text-green-600 dark:text-green-400">
                                                    {child.attendance}
                                                </div>
                                                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Attendance</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 py-4 border-t border-border/50">
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t.teacher}</p>
                                                <p className="font-medium text-sm flex items-center gap-1.5">
                                                    <UserCheck className="h-3.5 w-3.5 text-primary/70" />
                                                    {child.teacher}
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">{t.awards}</p>
                                                <p className="font-medium text-sm flex items-center gap-1.5">
                                                    <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                                                    {awardCounts[child.id] ?? '...'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-2">
                                            <Button variant="outline" className="w-full text-primary hover:text-primary hover:bg-primary/5 group/btn">
                                                View Full Profile <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Column (Lunch & Quick Actions) */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Quick Actions (New) */}
                    <Card className="border-primary/20 shadow-md bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Zap className="h-5 w-5 text-primary fill-primary/20" />
                                {t.actions || "Quick Actions"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            <Button variant="outline" className="h-auto py-3 w-full justify-start hover:bg-primary/5 hover:border-primary/30 transition-all group" asChild>
                                <Link href="/absence" className="flex items-center gap-4 w-full">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                                        <ClipboardCheck className="h-5 w-5" />
                                    </div>
                                    <span className="font-semibold text-sm text-foreground">{t.reportAbsence}</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-auto py-3 w-full justify-start hover:bg-primary/5 hover:border-primary/30 transition-all group" asChild>
                                <Link href="/calendar" className="flex items-center gap-4 w-full">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-sm shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                                        {new Date().getDate()}
                                    </div>
                                    <span className="font-semibold text-sm text-foreground">{t.calendar}</span>
                                </Link>
                            </Button>
                            <Button variant="outline" className="h-auto py-3 w-full justify-start hover:bg-primary/5 hover:border-primary/30 transition-all group" asChild>
                                <a href="https://www.parentpay.com/public/client/security/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 w-full">
                                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <span className="font-semibold text-sm text-foreground">ParentPay</span>
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Lunch Widget */}
                    <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-card to-accent/20">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Utensils className="h-5 w-5 text-primary" />
                                <span>{t.lunch}</span>
                            </CardTitle>
                            <CardDescription>{t.lunchDesc}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {isLoadingMenu ? (
                                <div className="space-y-4">
                                    <Skeleton className="h-8 w-3/4" />
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            ) : (
                                <>
                                    <div className="bg-background/60 p-4 rounded-xl border border-border/50 backdrop-blur-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Pizza className="h-4 w-4 text-primary" />
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.lunchMain}</h4>
                                        </div>
                                        <p className="font-serif text-lg font-medium leading-tight text-foreground">{todayMenu?.main}</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2"><Salad className="h-4 w-4" /> {t.lunchAlt}</span>
                                            <span className="font-medium">{todayMenu?.alt}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground flex items-center gap-2"><div className="h-4 w-4 rounded-full bg-pink-200 flex items-center justify-center text-[10px]">🍰</div> {t.lunchDessert}</span>
                                            <span className="font-medium">{todayMenu?.dessert}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {isMobile ? (
                                <Drawer>
                                    <DrawerTrigger asChild>
                                        <Button className="w-full shadow-lg shadow-primary/20">
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
                                        <Button className="w-full shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                                            <Utensils className="mr-2 h-4 w-4" /> {t.viewMenu}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-3xl">
                                        <div className="grid gap-4">
                                            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                                                <h2 className="text-lg font-semibold leading-none tracking-tight">{t.menuTitle}</h2>
                                                <p className="text-sm text-muted-foreground">{t.menuDesc}</p>
                                            </div>
                                            <MenuDialogContent weeklyMenu={weeklyMenu} isLoadingMenu={isLoadingMenu} t={t} days={days} />
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </CardContent>
                    </Card>



                </div>

            </div>
        </div>
    );
}

const DashboardSkeleton = () => (
    <div className="space-y-8">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <div className="lg:col-span-8 space-y-6">
                <Skeleton className="h-48 w-full rounded-xl" />
                <div className="grid grid-cols-2 gap-6">
                    <Skeleton className="h-56 w-full rounded-xl" />
                    <Skeleton className="h-56 w-full rounded-xl" />
                </div>
            </div>
            <div className="lg:col-span-4 space-y-6">
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
    </div>
);


export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardContent />
        </Suspense>
    );
}
