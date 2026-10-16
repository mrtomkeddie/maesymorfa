
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';

import { Pencil, Trash2, Loader2, Search, Megaphone, Calendar, ExternalLink, Plus } from 'lucide-react';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/db/firebase';
import { deleteFile } from '@/lib/firebase/storage';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminItem } from '@/components/admin/AnnouncementForm';
import { LunchMenuReminder } from '@/components/admin/LunchMenuReminder';
import { useLunchMenus } from '@/hooks/useLunchMenus';
import { lastDayOf, ukDay } from '@/lib/utils';

const AnnouncementForm = dynamic(() => import('@/components/admin/AnnouncementForm').then(mod => mod.AnnouncementForm), {
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>,
});

const isValidDate = (date: unknown) => !!date && !isNaN(new Date(date as string).getTime());
const showDay = (iso: string | undefined, pattern: string) => (isValidDate(iso) ? format(new Date(iso as string), pattern) : '-');

const itemKey = (item: AdminItem) => (item.news ? `news-${item.news.id}` : `event-${item.event?.id}`);
const itemTitle = (item: AdminItem) => item.news?.title_en || item.event?.title_en || '(no title)';
// Posts sort by the day they were posted; older calendar entries with no post by their day
const itemDate = (item: AdminItem) => item.news?.date ?? item.event?.start ?? '';
const isHidden = (item: AdminItem) => (item.news ?? item.event)?.published === false;

// Where the item can be seen on the public site (hidden items and old posts without a web address have none)
const siteLink = (item: AdminItem) => {
  if (isHidden(item)) return null;
  if (item.news) return item.news.slug ? `/news/${item.news.slug}` : null;
  return '/events';
};

// Pairs each post with its calendar entry. They are linked both ways, so either link is enough.
const toItems = (news: NewsPostWithId[], events: CalendarEventWithId[], bannerId: string | null): AdminItem[] => {
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const paired = new Set<string>();
  const items: AdminItem[] = news.map((post) => {
    const event = (post.eventId ? eventsById.get(post.eventId) : undefined) ?? events.find((e) => e.newsId === post.id) ?? null;
    if (event) paired.add(event.id);
    return { news: post, event, isBanner: post.id === bannerId };
  });
  // Older calendar entries with no news post still show, so they can be edited or deleted
  events.filter((event) => !paired.has(event.id)).forEach((event) => items.push({ news: null, event, isBanner: false }));
  return items.sort((a, b) => (new Date(itemDate(b)).getTime() || 0) - (new Date(itemDate(a)).getTime() || 0));
};

export default function AnnouncementsAdminPage() {
  const [items, setItems] = useState<AdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<AdminItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  // Whether the school has added its own news / events yet (until then the site shows samples)
  const [started, setStarted] = useState({ news: true, events: true });
  const lunchMenus = useLunchMenus();

  const { toast } = useToast();

  const fetchItems = async () => {
    setIsLoading(true);
    let newsPosts: NewsPostWithId[] = [];
    let calendarEvents: CalendarEventWithId[] = [];
    let bannerId: string | null = null;
    try {
      let site;
      [newsPosts, calendarEvents, site] = await Promise.all([db.getAllNews(), db.getAllCalendarEvents(), db.getSiteContent()]);
      setStarted({ news: site.news, events: site.events });
      bannerId = site.urgentNewsId;
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({ title: 'Could not load your posts', description: 'Check your internet connection, then refresh the page.', variant: 'destructive' });
    }
    setItems(toItems(newsPosts, calendarEvents, bannerId));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredItems = useMemo(() => {
    let result = items;
    if (typeFilter === 'event') result = result.filter((item) => item.event);
    if (typeFilter === 'news') result = result.filter((item) => !item.event);
    if (searchQuery) {
      result = result.filter((item) => itemTitle(item).toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [items, searchQuery, typeFilter]);

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedItem(null);
  };

  const handleFormSuccess = () => {
    closeForm();
    fetchItems();
  };

  const openNew = () => {
    setSelectedItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: AdminItem) => {
    setSelectedItem(item);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
      if (!itemToDelete) return;

      try {
        const files = await db.deletePost({ newsId: itemToDelete.news?.id ?? null, eventId: itemToDelete.event?.id ?? null });

        // A post and its calendar entry share one file. It is only removed when nothing else uses it,
        // and kept if that cannot be checked (the post is already gone; a file left behind is harmless)
        for (const url of files) {
          const inUse = await db.isAttachmentInUse(url).catch(() => true);
          if (!inUse) await deleteFile(url).catch((error) => console.error('Could not delete attachment:', error));
        }

        toast({ title: 'Deleted', description: 'It is no longer on the website.' });
        fetchItems();
      } catch (error) {
        console.error("Error deleting announcement:", error);
        toast({
            title: 'Not deleted',
            description: 'Something went wrong, or someone else has just changed it. The list has been refreshed. Check it and try again.',
            variant: "destructive",
        });
        fetchItems();
      } finally {
        setItemToDelete(null);
      }
  };

  const WhereBadges = ({ item }: { item: AdminItem }) => (
    <div className="flex flex-wrap gap-2">
      {item.news && (
        <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
          <Megaphone className="h-3 w-3" /> Latest News
        </Badge>
      )}
      {item.event && (
        <Badge variant="outline" className="gap-1.5 whitespace-nowrap">
          {/* Event days are UK days, wherever the admin is */}
          <Calendar className="h-3 w-3" /> Event: {isValidDate(item.event.start) ? format(ukDay(item.event.start), 'EEE d MMM yyyy') : '-'}
          {(() => { const last = lastDayOf(item.event.start, item.event.end); return last && <> to {format(last, 'EEE d MMM yyyy')}</>; })()}
        </Badge>
      )}
    </div>
  );

  const Posted = ({ item }: { item: AdminItem }) => (
    <span className="whitespace-nowrap text-sm text-muted-foreground">
      {item.news ? `Posted ${showDay(item.news.date, 'd MMM yyyy')}` : 'Calendar only (older entry)'}
    </span>
  );

  const StatusBadges = ({ item }: { item: AdminItem }) => (
    <div className="flex flex-wrap gap-2">
      {isHidden(item)
        ? <Badge variant="secondary">Hidden</Badge>
        : <Badge className="bg-green-600 hover:bg-green-600 text-white">Live</Badge>}
      {item.isBanner && <Badge variant="destructive">Homepage banner</Badge>}
    </div>
  );

  // One line on desktop; on phones the buttons wrap under the post
  const ItemActions = ({ item, oneLine = false }: { item: AdminItem; oneLine?: boolean }) => {
    const link = siteLink(item);
    return (
      <div className={oneLine ? 'flex flex-nowrap items-center justify-end gap-2' : 'grid grid-cols-3 gap-2 [&>*]:w-full'}>
        {link && (
          <Button variant="ghost" size="sm" className="px-2" asChild>
            <a href={link} target="_blank" rel="noopener noreferrer" title="See it on the website">
              <ExternalLink className="mr-2 h-4 w-4" /> View
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" className="px-2.5" onClick={() => handleEdit(item)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
        <Button variant="outline" size="sm" onClick={() => setItemToDelete(item)} className="px-2.5 text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>
    );
  };

  const EmptyState = () => (
    <p className="py-8 text-center text-muted-foreground">
      {items.length === 0 ? 'Nothing added yet. Use "Add news or an event" above.' : 'Nothing matches your search.'}
    </p>
  );

  // Wide screens get the table; anything narrower than 1440px gets cards, which never need sideways
  // scrolling (a 1280px laptop with a scrollbar is just too narrow for the table)
  const DesktopView = () => (
    <div className="hidden overflow-x-auto min-[1440px]:block">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Where it shows</TableHead>
                <TableHead>On the website</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                <TableRow key={itemKey(item)}>
                    <TableCell className="font-medium">{itemTitle(item)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <WhereBadges item={item} />
                        <Posted item={item} />
                      </div>
                    </TableCell>
                    <TableCell><StatusBadges item={item} /></TableCell>
                    <TableCell><ItemActions item={item} oneLine /></TableCell>
                </TableRow>
                ))
            ) : (
                <TableRow>
                  <TableCell colSpan={4}><EmptyState /></TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  );

  const MobileView = () => (
     <div className="grid gap-4 md:grid-cols-2 min-[1440px]:hidden">
      {filteredItems.length > 0 ? (
        filteredItems.map((item) => (
            <Card key={itemKey(item)}>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold">{itemTitle(item)}</p>
                <WhereBadges item={item} />
                <Posted item={item} />
                <StatusBadges item={item} />
                <ItemActions item={item} />
              </CardContent>
            </Card>
        ))
      ) : (
        <div className="md:col-span-2"><EmptyState /></div>
      )}
    </div>
  );

  return (
    <Dialog open={isFormOpen} onOpenChange={(isOpen) => { if (!isOpen) closeForm(); }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">News and events</h1>
                <p className="text-muted-foreground">Anything you add here goes on the website straight away.</p>
            </div>
            <Button size="lg" onClick={openNew} className="w-full md:w-auto">
                <Plus className="mr-2 h-5 w-5" /> Add news or an event
            </Button>
        </div>

        <div className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <p className="flex gap-3">
            <Megaphone className="h-5 w-5 shrink-0 text-primary" />
            <span><strong>Every post</strong> goes under Latest News on the home page.</span>
          </p>
          <p className="flex gap-3">
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
            <span><strong>Give it a day</strong> and it also goes under Upcoming Events and onto parents&apos; phones.</span>
          </p>
        </div>

        {!lunchMenus.isLoading && !lunchMenus.loadFailed && <LunchMenuReminder menus={lunchMenus.menus} />}

        {isFirebaseConfigured && !isLoading && (!started.news || !started.events) && (
          <div className="rounded-lg border bg-secondary/40 p-4 text-sm text-muted-foreground">
            The website shows a few sample {!started.news && !started.events ? 'news stories and events' : !started.news ? 'news stories' : 'events'} until
            you add your own, so the pages are not empty. They disappear for good as soon as you do.
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                <div>
                    <CardTitle>Everything you have added</CardTitle>
                    <CardDescription>All your news and events. Edit or delete them here.</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by title..."
                            className="w-full pl-8 sm:w-[250px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                     <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Show..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Everything</SelectItem>
                            <SelectItem value="event">With a day</SelectItem>
                            <SelectItem value="news">Without a day</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
                <>
                  <DesktopView />
                  <MobileView />
                </>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={itemToDelete !== null} onOpenChange={(isOpen) => { if (!isOpen) setItemToDelete(null); }}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{itemToDelete ? itemTitle(itemToDelete) : 'this post'}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                  {itemToDelete?.news && itemToDelete?.event
                    ? 'It comes off Latest News and Upcoming Events straight away. This cannot be undone.'
                    : 'It comes off the website straight away. This cannot be undone.'}
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

       <DialogContent className="sm:max-w-[625px] max-h-[90vh] overflow-y-auto">
          {isFormOpen && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedItem ? 'Edit' : 'Add news or an event'}</DialogTitle>
                <DialogDescription>It goes on the website as soon as you save.</DialogDescription>
              </DialogHeader>
              <AnnouncementForm
                key={selectedItem ? itemKey(selectedItem) : 'new'}
                onSuccess={handleFormSuccess}
                existing={selectedItem}
              />
            </>
          )}
        </DialogContent>
    </Dialog>
  );
}
