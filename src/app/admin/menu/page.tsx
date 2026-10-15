'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useLunchMenus } from '@/hooks/useLunchMenus';
import { db } from '@/lib/db';
import { LunchMenuReminder } from '@/components/admin/LunchMenuReminder';
import {
  BUILT_IN_MENU,
  MENU_WEEKS,
  WEEK_DAYS,
  isRealIsoDay,
  menuSchedule,
  weekMenuFor,
  type LunchDay,
  type LunchMenu,
  type LunchMenuWithId,
  type WeekDay,
} from '@/lib/lunchMenu';

const DAY_NAMES: Record<WeekDay, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
};

// Same order and names as the council's menu
const DISH_FIELDS: { key: keyof LunchDay; label: string }[] = [
  { key: 'main', label: 'Main' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'alternative', label: 'Alternative' },
  { key: 'sides', label: 'Sides' },
  { key: 'salad', label: 'Salad' },
  { key: 'dessert', label: 'Dessert' },
];

const showDay = (day: string) => (day ? format(new Date(`${day}T12:00:00`), 'd MMM yyyy') : '?');

// A new menu starts as a copy of the newest one, so only the dishes that changed need typing
const copyOf = (menu: LunchMenu): LunchMenu => ({
  name: '',
  startsOn: '',
  endsOn: '',
  weeks: JSON.parse(JSON.stringify(menu.weeks)),
});

type Editing = { id: string | null; menu: LunchMenu };

export default function LunchMenuAdminPage() {
  const { toast } = useToast();
  const { menus, isLoading, loadFailed, reload } = useLunchMenus();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<LunchMenuWithId | null>(null);

  const sortedMenus = useMemo(() => [...menus].sort((a, b) => (a.startsOn < b.startsOn ? 1 : -1)), [menus]);
  const thisWeek = weekMenuFor(new Date(), menus);
  const schedule = useMemo(() => (editing ? menuSchedule(editing.menu) : []), [editing]);

  const startNewMenu = () => {
    setErrors([]);
    setEditing({ id: null, menu: copyOf(sortedMenus[0] ?? BUILT_IN_MENU) });
  };

  const editMenu = (menu: LunchMenuWithId) => {
    setErrors([]);
    setEditing({ id: menu.id, menu: JSON.parse(JSON.stringify({ name: menu.name, startsOn: menu.startsOn, endsOn: menu.endsOn, weeks: menu.weeks })) });
  };

  const setField = (field: 'name' | 'startsOn' | 'endsOn', value: string) =>
    setEditing((current) => (current ? { ...current, menu: { ...current.menu, [field]: value } } : current));

  const setDish = (week: (typeof MENU_WEEKS)[number], day: WeekDay, field: keyof LunchDay, value: string) =>
    setEditing((current) => {
      if (!current) return current;
      const weeks = { ...current.menu.weeks, [week]: { ...current.menu.weeks[week], [day]: { ...current.menu.weeks[week][day], [field]: value } } };
      return { ...current, menu: { ...current.menu, weeks } };
    });

  const save = async () => {
    if (!editing) return;
    const { menu } = editing;
    const problems: string[] = [];
    if (!menu.name.trim()) problems.push('Give the menu a name, e.g. "Winter menu 2026 to 2027".');
    if (!isRealIsoDay(menu.startsOn)) problems.push('Add the first day of week 1.');
    if (!isRealIsoDay(menu.endsOn)) problems.push('Add the last day the menu runs.');
    if (menu.startsOn && menu.endsOn && menu.startsOn > menu.endsOn) problems.push('The last day must be after the first day.');
    setErrors(problems);
    if (problems.length > 0) return;

    setIsSaving(true);
    try {
      const trimmed: LunchMenu = {
        name: menu.name.trim(),
        startsOn: menu.startsOn,
        endsOn: menu.endsOn,
        weeks: Object.fromEntries(MENU_WEEKS.map((week) => [week, Object.fromEntries(WEEK_DAYS.map((day) => [day,
          Object.fromEntries(DISH_FIELDS.map(({ key }) => [key, (menu.weeks[week]?.[day]?.[key] ?? '').trim()])),
        ]))])) as LunchMenu['weeks'],
      };
      await db.saveLunchMenu(editing.id, trimmed);
      toast({ title: 'Menu saved', description: 'The website uses it for the weeks it covers.' });
      setEditing(null);
      reload();
    } catch (error) {
      console.error('Could not save lunch menu:', error);
      toast({ title: 'Not saved', description: 'Something went wrong. Check your internet connection and try again.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await db.deleteLunchMenu(toDelete.id);
      toast({ title: 'Menu deleted', description: 'It is no longer on the website.' });
      reload();
    } catch (error) {
      console.error('Could not delete lunch menu:', error);
      toast({ title: 'Not deleted', description: 'Something went wrong. Please try again.', variant: 'destructive' });
    } finally {
      setToDelete(null);
    }
  };

  if (editing) {
    return (
      // Locked while saving, so nothing typed after pressing Save can be lost
      <fieldset disabled={isSaving} className="min-w-0 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Button variant="ghost" className="-ml-3 mb-2" onClick={() => setEditing(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to menus
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{editing.id ? 'Edit menu' : 'Add the new menu'}</h1>
            <p className="text-muted-foreground">
              {editing.id ? 'Change anything that is wrong, then save.' : 'We have copied in the last menu. Change the dishes that are different, then save.'}
            </p>
          </div>
          <Button onClick={save} disabled={isSaving} className="w-full md:w-auto">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save menu
          </Button>
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
            {errors.map((error) => <p key={error}>{error}</p>)}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Name and dates</CardTitle>
            <CardDescription>
              Copy the dates from the council&apos;s menu. Menus change over in whole weeks, from the Monday of the first day to the
              Friday of the last day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menu-name">Name</Label>
              <Input id="menu-name" placeholder="e.g., Winter menu 2026 to 2027" value={editing.menu.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="menu-start">First day of week 1</Label>
                <Input id="menu-start" type="date" value={editing.menu.startsOn} onChange={(e) => setField('startsOn', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="menu-end">Last day of this menu</Label>
                <Input id="menu-end" type="date" value={editing.menu.endsOn} onChange={(e) => setField('endsOn', e.target.value)} />
              </div>
            </div>
            {schedule.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">How the weeks will run</p>
                <p className="text-sm text-muted-foreground">
                  Holidays and half terms are skipped. Check this matches the council&apos;s dates. If they start again at week 1 after a
                  holiday, add that part as a separate menu from that date.
                </p>
                <div className="flex flex-wrap gap-2">
                  {schedule.map(({ weekStart, weekNumber }) => (
                    <Badge key={weekStart.toISOString()} variant="outline" className="font-normal">
                      {format(weekStart, 'd MMM')}: week {weekNumber}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="1">
          <TabsList>
            {MENU_WEEKS.map((week) => <TabsTrigger key={week} value={week}>Week {week}</TabsTrigger>)}
          </TabsList>
          {MENU_WEEKS.map((week) => (
            <TabsContent key={week} value={week} className="space-y-4">
              {WEEK_DAYS.map((day) => (
                <Card key={day}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Week {week}, {DAY_NAMES[day]}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {DISH_FIELDS.map(({ key, label }) => {
                      const id = `w${week}-${day}-${key}`;
                      return (
                        <div key={key} className="space-y-2">
                          <Label htmlFor={id}>{label}</Label>
                          <Input id={id} value={editing.menu.weeks[week]?.[day]?.[key] ?? ''} onChange={(e) => setDish(week, day, key, e.target.value)} />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={save} disabled={isSaving} className="w-full md:w-auto">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save menu
          </Button>
        </div>
      </fieldset>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lunch menu</h1>
          <p className="text-muted-foreground">The council&apos;s 3-week menu. They send a new one twice a year, in May and October.</p>
        </div>
        <Button onClick={startNewMenu} disabled={isLoading} className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add the new menu
        </Button>
      </div>

      {!isLoading && !loadFailed && <LunchMenuReminder menus={menus} showLink={false} />}
      {loadFailed && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load the menus. Check your internet connection, then refresh the page.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>On the website this week</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : thisWeek ? (
            <p>Week {thisWeek.weekNumber} of &quot;{thisWeek.menuName}&quot; (week starting {format(thisWeek.weekStart, 'd MMMM')}).</p>
          ) : (
            <p className="text-muted-foreground">No menu for this week (a holiday, or the menu has run out).</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Menus</CardTitle>
          <CardDescription>The website picks the right menu and week by itself.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              {sortedMenus.map((menu) => (
                <div key={menu.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold">{menu.name}</p>
                    <p className="text-sm text-muted-foreground">{showDay(menu.startsOn)} to {showDay(menu.endsOn)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <Button variant="outline" size="sm" onClick={() => editMenu(menu)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setToDelete(menu)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border border-dashed p-4">
                <p className="font-semibold">{BUILT_IN_MENU.name}</p>
                <p className="text-sm text-muted-foreground">
                  {showDay(BUILT_IN_MENU.startsOn)} to {showDay(BUILT_IN_MENU.endsOn)}. Built into the website before this page existed, so it
                  cannot be edited here. &quot;Add the new menu&quot; copies it as a starting point.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={toDelete !== null} onOpenChange={(open) => { if (!open) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{toDelete?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>The website stops showing this menu straight away. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
