'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { Utensils } from 'lucide-react';
import { COUNCIL_MENU_URL, firstWeekWithoutMenu, type LunchMenu } from '@/lib/lunchMenu';

// Shown in the admin area when one of the next four school weeks has no lunch menu,
// so the school adds the council's new menu before the website runs out.
export function LunchMenuReminder({ menus, showLink = true }: { menus: LunchMenu[]; showLink?: boolean }) {
  const gap = firstWeekWithoutMenu(new Date(), menus);
  if (!gap) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <Utensils className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">The lunch menu needs updating</p>
          <p>
            From the week of {format(gap, 'd MMMM')} there is no lunch menu on the website. Add the council&apos;s new menu
            (they send one in May and October, or see the{' '}
            <a href={COUNCIL_MENU_URL} target="_blank" rel="noopener noreferrer" className="font-medium underline">council&apos;s school meals page</a>).
          </p>
        </div>
      </div>
      {showLink && (
        <Link href="/admin/menu" className="shrink-0 rounded-md bg-amber-900 px-4 py-2 text-center font-medium text-white hover:bg-amber-800">
          Update the lunch menu
        </Link>
      )}
    </div>
  );
}
