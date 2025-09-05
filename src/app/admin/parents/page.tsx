
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, UserPlus, Eye, Search } from 'lucide-react';
import { db } from '@/lib/db';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import type { ParentWithId, ChildWithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { ParentForm } from '@/components/admin/ParentForm';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';

const DynamicParentForm = dynamic(() => import('@/components/admin/ParentForm').then(mod => mod.ParentForm), {
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>,
});

export default function ParentsAdminPage() {
  const [parents, setParents] = useState<ParentWithId[]>([]);
  const [children, setChildren] = useState<ChildWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState<ParentWithId | null>(null);
  const [parentToDelete, setParentToDelete] = useState<ParentWithId | null>(null);
  const [isViewParentDialogOpen, setIsViewParentDialogOpen] = useState(false);
  const [parentToView, setParentToView] = useState<ParentWithId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();

  const { toast } = useToast();

  const fetchParentsAndChildren = async (initial = false) => {
    setIsLoading(true);
    const parentsResult = await db.getPaginatedParents(20);
    const childrenData = await db.getChildren();
    setParents(parentsResult.data);
    setChildren(childrenData);
    setIsLoading(false);
  };


  useEffect(() => {
    fetchParentsAndChildren(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setSelectedParent(null);
    fetchParentsAndChildren(true);
  };

  const handleEdit = (parent: ParentWithId) => {
    setIsViewParentDialogOpen(false); // Close view dialog if open
    setSelectedParent(parent);
    setIsDialogOpen(true);
  };

  const handleViewParent = (parent: ParentWithId) => {
    setParentToView(parent);
    setIsViewParentDialogOpen(true);
  };

  const openDeleteAlert = (parent: ParentWithId) => {
    setParentToDelete(parent);
    setIsDeleteAlertOpen(true);
  }

  const handleDelete = async () => {
      if (!parentToDelete) return;

      try {
        await db.deleteParent(parentToDelete.id);
        toast({
            title: "Success",
            description: "Parent account deleted successfully.",
        });
        fetchParentsAndChildren(true);
      } catch (error) {
        console.error("Error deleting parent:", error);
        toast({
            title: "Error",
            description: "Failed to delete parent account. Please try again.",
            variant: "destructive",
        });
      } finally {
        setIsDeleteAlertOpen(false);
        setParentToDelete(null);
      }
  };
  
  const getLinkedChildrenNames = (parentId: string) => {
      const linkedChildren = children.filter(c => c.linkedParents?.some(lp => lp.parentId === parentId));
      if (linkedChildren.length === 0) return <span className="text-muted-foreground">None</span>;
      return linkedChildren.map(c => c.name).join(', ');
  }

  const filteredParents = useMemo(() => {
    return parents.filter(parent => 
      parent.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [parents, searchQuery]);

  const DesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Linked Children</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredParents.length > 0 ? (
          filteredParents.map((parent) => (
            <TableRow key={parent.id}>
              <TableCell className="font-medium">{parent.name}</TableCell>
              <TableCell>{parent.email}</TableCell>
                <TableCell>
                {getLinkedChildrenNames(parent.id)}
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
                        <DropdownMenuItem onClick={() => handleViewParent(parent)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(parent)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDeleteAlert(parent)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">
              No parents found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const MobileView = () => (
    <div className="space-y-4">
      {filteredParents.length > 0 ? (
        filteredParents.map((parent) => (
          <Card key={parent.id}>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold">{parent.name}</p>
              <p className="text-sm text-muted-foreground">{parent.email}</p>
              <div className="text-sm">
                <span className="font-medium">Children: </span>
                <span className="text-muted-foreground">{getLinkedChildrenNames(parent.id)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleViewParent(parent)}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEdit(parent)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteAlert(parent)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No parents found.</p>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setSelectedParent(null);
    }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Parent Management</h1>
                <p className="text-muted-foreground">Add, edit, and manage parent accounts.</p>
            </div>
             <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Parent
                </Button>
            </DialogTrigger>
        </div>

        <Card>
          <CardHeader>
              <div className='flex flex-col gap-4 md:flex-row md:justify-between'>
                  <div>
                      <CardTitle>All Parent Accounts</CardTitle>
                      <CardDescription>A list of all registered parents.</CardDescription>
                  </div>
                  <div className="relative w-full md:w-auto">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          type="search"
                          placeholder="Search by name..."
                          className="w-full pl-8 md:w-[250px]"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
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
                  This action cannot be undone. This will permanently delete the parent account.
                  This will not delete their children's records but will unlink them.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isViewParentDialogOpen} onOpenChange={setIsViewParentDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{parentToView?.name}</DialogTitle>
              <DialogDescription>
                Parent Details
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] pr-6">
              {parentToView && (
                <div className="space-y-4 py-4">
                  <div className="space-y-4">
                    <div>
                        <Label className="font-semibold">Email Address</Label>
                        <p className="text-muted-foreground">{parentToView.email}</p>
                    </div>
                    <div>
                        <Label className="font-semibold">Mobile Number</Label>
                        <p className="text-muted-foreground">{parentToView.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4">
                    <Label className="font-semibold">Linked Children</Label>
                    {(() => {
                      const linkedChildren = children.filter(c => c.linkedParents?.some(lp => lp.parentId === parentToView.id));
                      return linkedChildren.length > 0 ? (
                        <div className="mt-2 space-y-3">
                          {linkedChildren.map((child) => {
                            const relationship = child.linkedParents?.find(lp => lp.parentId === parentToView.id)?.relationship;
                            return (
                              <div key={child.id} className="flex items-center justify-between rounded-lg p-3 bg-secondary">
                                <div>
                                  <p className="font-medium text-secondary-foreground">{child.name}</p>
                                  <p className="text-sm text-secondary-foreground/80">{child.yearGroup} ({relationship})</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-2">No children linked to this parent.</p>
                      );
                    })()}
                  </div>
                </div>
              )}
            </ScrollArea>
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={() => handleEdit(parentToView!)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit Parent
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

       <DialogContent className="sm:max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedParent ? 'Edit' : 'Add'} Parent</DialogTitle>
            <DialogDescription>
              Fill in the details for the parent account.
            </DialogDescription>
          </DialogHeader>
          <DynamicParentForm
            onSuccess={handleFormSuccess}
            existingParent={selectedParent}
            allChildren={children}
          />
        </DialogContent>
    </Dialog>
  );
}

    
