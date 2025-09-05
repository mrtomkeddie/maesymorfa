
'use client';

import { DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WeeklyMenu } from '@/lib/types';

interface MenuContentProps {
    weeklyMenu: WeeklyMenu | null;
    isLoadingMenu: boolean;
    t: any;
    days: string[];
}

export default function MenuDrawerContent({ weeklyMenu, isLoadingMenu, t, days }: MenuContentProps) {
    return (
        <>
            <DrawerHeader className="text-left">
                <DrawerTitle>{t.menuTitle}</DrawerTitle>
                <DrawerDescription>{t.menuDesc}</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-4">
                {isLoadingMenu ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <ScrollArea className="h-[60vh]">
                        <div className="space-y-4">
                            {days.map(day => (
                                <Card key={day}>
                                    <CardHeader>
                                        <CardTitle className="capitalize">{day}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        <p><strong>{t.mainCourse}:</strong> {weeklyMenu?.[day]?.main || t.notAvailable}</p>
                                        <p><strong>{t.vegAlt}:</strong> {weeklyMenu?.[day]?.alt || t.notAvailable}</p>
                                        <p><strong>{t.dessertCourse}:</strong> {weeklyMenu?.[day]?.dessert || t.notAvailable}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </>
    );
}
