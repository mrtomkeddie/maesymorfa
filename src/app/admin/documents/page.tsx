
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
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Loader2, Link as LinkIcon, Search } from 'lucide-react';
import { db } from '@/lib/db';
import type { DocumentWithId } from '@/lib/types';
import { deleteFile } from '@/lib/firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { DocumentForm, documentCategories } from '@/components/admin/DocumentForm';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import dynamic from 'next/dynamic';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';

const DynamicDocumentForm = dynamic(() => import('@/components/admin/DocumentForm').then(mod => mod.DocumentForm), {
  loading: () => <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin"/></div>,
});

export default function DocumentsAdminPage() {
  const [documents, setDocuments] = useState<DocumentWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DocumentWithId | null>(null);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentWithId | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const isMobile = useIsMobile();

  const { toast } = useToast();

  const fetchDocuments = async (initial = false) => {
    setIsLoading(true);
    const { data } = await db.getPaginatedDocuments(100);
    setDocuments(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchDocuments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDocuments = useMemo(() => {
    let result = [...documents];
    if (categoryFilter !== 'all') {
      result = result.filter(doc => doc.category === categoryFilter);
    }
    if (searchQuery) {
      result = result.filter(doc => doc.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [documents, searchQuery, categoryFilter]);

  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setSelectedDocument(null);
    fetchDocuments(true);
  };

  const handleEdit = (doc: DocumentWithId) => {
    setSelectedDocument(doc);
    setIsDialogOpen(true);
  };
  
  const openDeleteAlert = (doc: DocumentWithId) => {
    setDocumentToDelete(doc);
    setIsDeleteAlertOpen(true);
  }

  const handleDelete = async () => {
      if (!documentToDelete) return;

      try {
        // First, delete the file from storage
        await deleteFile(documentToDelete.fileUrl);
        // Then, delete the document from Firestore
        await db.deleteDocument(documentToDelete.id);

        toast({
            title: "Success",
            description: "Document deleted successfully.",
            variant: "default",
        });
        fetchDocuments(true);
      } catch (error) {
        console.error("Error deleting document:", error);
        toast({
            title: "Error",
            description: "Failed to delete document. Please try again.",
            variant: "destructive",
        });
      } finally {
        setIsDeleteAlertOpen(false);
        setDocumentToDelete(null);
      }
  };

  const DesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>File</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.title}</TableCell>
              <TableCell><Badge variant="outline">{doc.category}</Badge></TableCell>
                <TableCell>
                <Button variant="link" asChild className="p-0 h-auto">
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm">
                        <LinkIcon className="h-4 w-4" /> View File
                    </a>
                </Button>
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
                        <DropdownMenuItem onClick={() => handleEdit(doc)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDeleteAlert(doc)} className="text-destructive focus:text-destructive">
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
              No documents found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const MobileView = () => (
    <div className="space-y-4">
      {filteredDocuments.length > 0 ? (
        filteredDocuments.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="p-4 space-y-3">
              <p className="font-semibold">{doc.title}</p>
              <Badge variant="outline">{doc.category}</Badge>
              <Separator />
              <div className="flex items-center justify-between">
                <Button variant="link" asChild className="p-0 h-auto">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm">
                      <LinkIcon className="h-4 w-4" /> View File
                  </a>
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(doc)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openDeleteAlert(doc)}>
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
         <div className="text-center py-8 text-muted-foreground">
            <p>No documents found.</p>
        </div>
      )}
    </div>
  );


  return (
     <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        setIsDialogOpen(isOpen);
        if (!isOpen) setSelectedDocument(null);
    }}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
                <p className="text-muted-foreground">Upload and manage policies, forms, and newsletters.</p>
            </div>
             <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Upload Document
                </Button>
            </DialogTrigger>
        </div>
        
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:justify-between">
                <div>
                    <CardTitle>Uploaded Documents</CardTitle>
                    <CardDescription>A list of all documents available on the parent portal.</CardDescription>
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
                     <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className='w-full sm:w-[180px]'>
                            <SelectValue placeholder="Filter by category..."/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {documentCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
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
                  This action cannot be undone. This will permanently delete the document
                  from our servers.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{selectedDocument ? 'Edit' : 'Upload'} Document</DialogTitle>
          <DialogDescription>
            Fill in the details below. The file will be available to parents once saved.
          </DialogDescription>
        </DialogHeader>
        <DynamicDocumentForm
          onSuccess={handleFormSuccess}
          existingDocument={selectedDocument}
        />
      </DialogContent>
    </Dialog>
  );
}

    
