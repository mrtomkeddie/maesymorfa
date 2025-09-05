
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, FileText, Search, Megaphone, Calendar } from 'lucide-react';
import { db } from '@/lib/db';
import type { NewsPostWithId, CalendarEventWithId } from '@/lib/types';
import { deleteFile } from '@/lib/firebase/storage';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';

const AnnouncementForm = dynamic(() => import('@/components/admin/AnnouncementForm').then(mod => mod.AnnouncementForm), {
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>,
});


type Announcement = (NewsPostWithId & { type: 'news' }) | (CalendarEventWithId & { type: 'event' });

export default function AnnouncementsAdminPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [itemToDelete, setItemToDelete] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const isMobile = useIsMobile();

  const { toast } = useToast();

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    const newsPosts = await db.getNews();
    const calendarEvents = await db.getCalendarEvents();

    const allAnnouncements: Announcement[] = [
        ...newsPosts.map(n => ({...n, type: 'news' as const })),
        ...calendarEvents.map(e => ({...e, type: 'event' as const })),
    ];
    
    allAnnouncements.sort((a, b) => {
        const dateA = new Date(a.type === 'news' ? a.date : a.start).getTime();
        const dateB = new Date(b.type === 'news' ? b.date : b.start).getTime();
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
      result = result.filter(n => n.title_en.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [announcements, searchQuery, typeFilter]);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setSelectedAnnouncement(null);
    fetchAnnouncements();
  };

  const handleEdit = (item: Announcement) => {
    setSelectedAnnouncement(item);
    setIsDialogOpen(true);
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

        if (itemToDelete.attachmentUrl) {
           await deleteFile(itemToDelete.attachmentUrl);
        }

        toast({
            title: "Success",
            description: "Announcement deleted successfully.",
            variant: "default",
        });
        fetchAnnouncements();
      } catch (error) {
        console.error("Error deleting announcement:", error);
        toast({
            title: "Error",
            description: "Failed to delete announcement. Please try again.",
            variant: "destructive",
        });
      } finally {
        setIsDeleteAlertOpen(false);
        setItemToDelete(null);
      }
  };
  
  const isValidDate = (date: any) => {
    return date && !isNaN(new Date(date).getTime());
  }

  const DesktopView = () => (
    <div className="overflow-x-auto">
        <Table>
            <TableHeader>
            <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {filteredAnnouncements.length > 0 ? (
                filteredAnnouncements.map((item) => {
                const itemDate = item.type === 'news' ? item.date : item.start;
                return (
                <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="font-medium">{item.title_en}</TableCell>
                    <TableCell>
                    <Badge variant="outline" className="gap-2">
                        {item.type === 'news' ? <Megaphone className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                        <span className="capitalize">{item.type}</span>
                    </Badge>
                    </TableCell>
                    <TableCell>{isValidDate(itemDate) ? format(new Date(itemDate), 'dd MMM yyyy') : 'Invalid Date'}</TableCell>
                    <TableCell>
                    {item.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(item)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDeleteAlert(item)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    </TableCell>
                </TableRow>
                )})
            ) : (
                <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                    No announcements found.
                </TableCell>
                </TableRow>
            )}
            </TableBody>
        </Table>
    </div>
  );

  const MobileView = () => (
     <div className="space-y-4">
      {filteredAnnouncements.length > 0 ? (
        filteredAnnouncements.map((item) => {
          const itemDate = item.type === 'news' ? item.date : item.start;
          return (
            <Card key={`${item.type}-${item.id}`}>
              <CardContent className="p-4 space-y-3">
                <p className="font-semibold">{item.title_en}</p>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <Badge variant="outline" className="gap-2">
                        {item.type === 'news' ? <Megaphone className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                        <span className="capitalize">{item.type}</span>
                    </Badge>
                    <span>{isValidDate(itemDate) ? format(new Date(itemDate), 'dd MMM yyyy') : 'Invalid Date'}</span>
                </div>
                 {item.isUrgent && <Badge variant="destructive">Urgent</Badge>}
                <Separator />
                <div className="flex items-center justify-end gap-2">
                     <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => openDeleteAlert(item)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                </div>
              </CardContent>
            </Card>
          )
        })
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No announcements found.</p>
        </div>
      )}
    </div>
  );


  return (
    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setSelectedAnnouncement(null);
    }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
                <p className="text-muted-foreground">Create, edit, and manage all school announcements, news, and events.</p>
            </div>
             <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Announcement
                </Button>
            </DialogTrigger>
        </div>
        

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                <div>
                    <CardTitle>Published Communications</CardTitle>
                    <CardDescription>A list of all news posts and calendar events.</CardDescription>
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
                        <SelectTrigger className="w-full sm:w-[150px]">
                            <SelectValue placeholder="Filter by type..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="event">Event</SelectItem>
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
                isMobile ? <MobileView /> : <DesktopView />
            )}
          </CardContent>
        </Card>
        
        <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the announcement.
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
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement ? 'Edit' : 'Create'} Announcement</DialogTitle>
            <DialogDescription>
              Fill in the details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <AnnouncementForm
            onSuccess={handleFormSuccess}
            existingAnnouncement={selectedAnnouncement}
          />
        </DialogContent>
    </Dialog>
  );
}
