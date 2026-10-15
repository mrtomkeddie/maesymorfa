
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

import { Pencil, Trash2, Loader2, Search, Megaphone, Calendar, ExternalLink } from 'lucide-react';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/db/firebase';
import { deleteFile } from '@/lib/firebase/storage';
import { isFirebaseConfigured } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AnnouncementKind } from '@/components/admin/AnnouncementForm';
import { LunchMenuReminder } from '@/components/admin/LunchMenuReminder';
import { useLunchMenus } from '@/hooks/useLunchMenus';

const AnnouncementForm = dynamic(() => import('@/components/admin/AnnouncementForm').then(mod => mod.AnnouncementForm), {
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>,
});


type Announcement = (NewsPostWithId & { type: 'news' }) | (CalendarEventWithId & { type: 'event' });

// Same words as the home page ("Latest News", "Upcoming Events"), so staff know where each one goes
const CHOICES = [
  {
    kind: 'news' as const,
    icon: Megaphone,
    name: 'News',
    when: 'Choose this for a message or story for parents.',
    examples: 'For example: the school is closed today, a letter home, or how the Year 4 trip went.',
    where: 'Goes under Latest News on the home page.',
    button: 'Add news',
  },
  {
    kind: 'event' as const,
    icon: Calendar,
    name: 'Event',
    when: 'Choose this for something happening on a set day.',
    examples: 'For example: an INSET day, Sports Day or a school trip.',
    where: 'Goes under Upcoming Events on the home page.',
    button: 'Add an event',
  },
];

const DIALOG_TEXT: Record<'news' | 'event', { add: string; edit: string; description: string }> = {
  news: {
    add: 'Add news',
    edit: 'Edit news',
    description: 'Goes under Latest News on the home page straight away.',
  },
  event: {
    add: 'Add an event',
    edit: 'Edit event',
    description: "Goes under Upcoming Events on the home page straight away. Parents who added the school dates to their phone get it too.",
  },
};

const itemDate = (item: Announcement) => (item.type === 'news' ? item.date : item.start);
const isValidDate = (date: unknown) => !!date && !isNaN(new Date(date as string).getTime());
const showDate = (item: Announcement) => (isValidDate(itemDate(item)) ? format(new Date(itemDate(item)), 'dd MMM yyyy') : '-');

// Where the item can be seen on the public site (hidden items and old posts without a web address have none)
const siteLink = (item: Announcement) => {
  if (item.published === false) return null;
  return item.type === 'news' ? (item.slug ? `/news/${item.slug}` : null) : '/events';
};

export default function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogKind, setDialogKind] = useState<AnnouncementKind | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  // Whether the school has added its own news / events yet (until then the site shows samples)
  const [started, setStarted] = useState({ news: true, events: true });
  const lunchMenus = useLunchMenus();

  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    let newsPosts: NewsPostWithId[] = [];
    let calendarEvents: CalendarEventWithId[] = [];
    try {
      let contentStarted;
      [newsPosts, calendarEvents, contentStarted] = await Promise.all([db.getAllNews(), db.getAllCalendarEvents(), db.getContentStarted()]);
      setStarted(contentStarted);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast({ title: 'Could not load your posts', description: 'Check your internet connection, then refresh the page.', variant: 'destructive' });
    }

    const allAnnouncements: Announcement[] = [
        ...newsPosts.map(n => ({...n, type: 'news' as const })),
        ...calendarEvents.map(e => ({...e, type: 'event' as const })),
    ];

    allAnnouncements.sort((a, b) => {
        const dateA = new Date(itemDate(a)).getTime() || 0;
        const dateB = new Date(itemDate(b)).getTime() || 0;
        return dateB - dateA;
    });

    setAnnouncements(allAnnouncements);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAnnouncements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAnnouncements = useMemo(() => {
    let result = [...announcements];

    if (typeFilter !== 'all') {
      result = result.filter(n => n.type === typeFilter);
    }

    if (searchQuery) {
      result = result.filter(n => (n.title_en || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [announcements, searchQuery, typeFilter]);

  const closeDialog = () => {
    setDialogKind(null);
    setSelectedAnnouncement(null);
  };

  const handleFormSuccess = () => {
    closeDialog();
    fetchAnnouncements();
  };

  const openNew = (kind: AnnouncementKind) => {
    setSelectedAnnouncement(null);
    setDialogKind(kind);
  };

  const handleEdit = (item: Announcement) => {
    setSelectedAnnouncement(item);
    setDialogKind(item.type);
  };

  const openDeleteAlert = (item: Announcement) => {
    setItemToDelete(item);
    setIsDeleteAlertOpen(true);
  }

  const handleDelete = async () => {
      if (!itemToDelete) return;

      try {
        if (itemToDelete.type === 'news') {
            await db.deleteNews(itemToDelete.id);
        } else {
            await db.deleteCalendarEvent(itemToDelete.id);
        }

        // A news post and a calendar entry made together share one file; keep it while either uses it
        const fileStillUsed = announcements.some(a => a !== itemToDelete && a.attachmentUrl === itemToDelete.attachmentUrl);
        if (itemToDelete.attachmentUrl && !fileStillUsed) {
           // The post is already gone; a file left behind is harmless
           await deleteFile(itemToDelete.attachmentUrl).catch((error) => console.error('Could not delete attachment:', error));
        }

        toast({ title: 'Deleted', description: 'It is no longer on the website.' });
        fetchAnnouncements();
      } catch (error) {
        console.error("Error deleting announcement:", error);
        toast({
            title: 'Not deleted',
            description: 'Something went wrong. Please try again.',
            variant: "destructive",
        });
      } finally {
        setIsDeleteAlertOpen(false);
        setItemToDelete(null);
      }
  };

  const TypeBadge = ({ item }: { item: Announcement }) => (
    <Badge variant="outline" className="gap-2">
      {item.type === 'news' ? <Megaphone className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
      <span>{item.type === 'news' ? 'News' : 'Event'}</span>
    </Badge>
  );

  const StatusBadges = ({ item }: { item: Announcement }) => (
    <div className="flex flex-wrap gap-2">
      {item.published === false
        ? <Badge variant="secondary">Hidden</Badge>
        : <Badge className="bg-green-600 hover:bg-green-600 text-white">Live</Badge>}
      {item.type === 'news' && item.isUrgent && <Badge variant="destructive">Homepage banner</Badge>}
    </div>
  );

  // One line on desktop; on phones the buttons wrap under the post
  const ItemActions = ({ item, oneLine = false }: { item: Announcement; oneLine?: boolean }) => {
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
        <Button variant="outline" size="sm" onClick={() => openDeleteAlert(item)} className="px-2.5 text-destructive hover:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </Button>
      </div>
    );
  };

  const EmptyState = () => (
    <p className="py-8 text-center text-muted-foreground">
      {announcements.length === 0 ? 'Nothing added yet. Use "Add news" or "Add an event" above.' : 'Nothing matches your search.'}
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
                <TableHead>Type and date</TableHead>
                <TableHead>On the website</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {filteredAnnouncements.length > 0 ? (
                filteredAnnouncements.map((item) => (
                <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.title_en || '(no title)'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <TypeBadge item={item} />
                        <span className="whitespace-nowrap text-sm text-muted-foreground">{showDate(item)}</span>
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
      {filteredAnnouncements.length > 0 ? (
        filteredAnnouncements.map((item) => (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold">{item.title_en || '(no title)'}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <TypeBadge item={item} />
                    <span>{showDate(item)}</span>
                </div>
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

  const dialogText = dialogKind ? DIALOG_TEXT[dialogKind] : null;

  return (
    <Dialog open={dialogKind !== null} onOpenChange={(isOpen) => { if (!isOpen) closeDialog(); }}>
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">News and events</h1>
            <p className="text-muted-foreground">Anything you add here goes on the website straight away.</p>
        </div>

        <section aria-labelledby="add-heading" className="space-y-3">
          <h2 id="add-heading" className="text-xl font-semibold">What do you want to add?</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {CHOICES.map((choice) => (
              <Card key={choice.kind} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <choice.icon className="h-5 w-5 text-primary" /> {choice.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-2">
                  <p className="font-medium">{choice.when}</p>
                  <p className="text-sm text-muted-foreground">{choice.examples}</p>
                  <p className="text-sm text-muted-foreground">{choice.where}</p>
                  <Button className="mt-auto w-full sm:w-auto sm:self-start" onClick={() => openNew(choice.kind)}>
                    <choice.icon className="mr-2 h-4 w-4" /> {choice.button}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">Not sure?</strong> If it happens on a set day, choose Event. Anything else, choose News.
            {' '}<strong className="font-semibold text-foreground">Need both?</strong> Choose Event, then switch on &quot;Also put this under Latest News&quot;.
          </p>
        </section>

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
                            <SelectItem value="all">News and events</SelectItem>
                            <SelectItem value="news">News only</SelectItem>
                            <SelectItem value="event">Events only</SelectItem>
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

        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Delete &quot;{itemToDelete?.title_en || 'this post'}&quot;?</AlertDialogTitle>
              <AlertDialogDescription>
                  It will come off the website straight away. This cannot be undone.
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
          {dialogKind && dialogText && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAnnouncement ? dialogText.edit : dialogText.add}</DialogTitle>
                <DialogDescription>{dialogText.description}</DialogDescription>
              </DialogHeader>
              <AnnouncementForm
                key={`${dialogKind}-${selectedAnnouncement?.id ?? 'new'}`}
                kind={dialogKind}
                onSuccess={handleFormSuccess}
                existingAnnouncement={selectedAnnouncement}
              />
            </>
          )}
        </DialogContent>
    </Dialog>
  );
}
