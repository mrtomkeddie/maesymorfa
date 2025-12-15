
'use client';


// ... imports
import { Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { WeeklyMenu } from '@/lib/types';

interface MenuContentProps {
    weeklyMenu: WeeklyMenu | null;
    isLoadingMenu: boolean;
    t: any;
    days: string[];
}

export default function MenuDialogContent({ weeklyMenu, isLoadingMenu, t, days }: MenuContentProps) {
    return (
        <div className="pt-4">
            {isLoadingMenu ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[100px]">{t.day}</TableHead>
                            <TableHead>{t.mainCourse}</TableHead>
                            <TableHead>{t.vegAlt}</TableHead>
                            <TableHead>{t.dessertCourse}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {days.map(day => (
                            <TableRow key={day}>
                                <TableCell className="font-medium capitalize">{day}</TableCell>
                                <TableCell>{weeklyMenu?.[day]?.main || t.notAvailable}</TableCell>
                                <TableCell>{weeklyMenu?.[day]?.alt || t.notAvailable}</TableCell>
                                <TableCell>{weeklyMenu?.[day]?.dessert || t.notAvailable}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
