
'use client';

import { useEffect, useState, Suspense } from 'react';
import { db } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import type { ChildWithId, StaffMemberWithId, InboxMessageWithId, ParentNotificationWithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, FileText, User, Info, MessageSquare, Award, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { AlertTriangle, BookOpen, Link as LinkIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const content = {
    en: {
        myClass: 'My Class',
        welcome: 'Welcome, {name}. Here\'s an overview of your class today.',
        classList: 'Class List',
        upcomingAbsences: 'Upcoming Absences',
        upcomingAbsencesDesc: 'Absences reported for today and future dates.',
        noAbsences: 'No absences reported for your class.',
        nameHeader: 'Name',
        actionsHeader: 'Actions',
        viewDetails: 'View Details',
        notifyParent: 'Notify Parent',
        childDetailsTitle: 'Child Details',
        childDetailsDesc: 'Key information for this student. For full details, please contact the school office.',
        parentContactTitle: 'Parent/Guardian Contact',
        noParentsLinked: 'No parents linked.',
        medicalTitle: 'Allergies & Medical',
        medicalNone: 'No known allergies or medical conditions.',
        profileTitle: 'One Page Profile / IDP',
        profileView: 'View Document',
        profileNone: 'No profile document uploaded.',
        reason: 'Reason',
        date: 'Date',
        awardSummaryTitle: 'Values Award Summary',
        awardCountHeader: 'Awards This Year',
        awardDatesTitle: 'Award Dates for {childName}',
        awardDatesDesc: 'A list of dates this student received a Values Award.'
    },
    cy: {
        myClass: 'Fy Nosbarth',
        welcome: 'Croeso, {name}. Dyma drosolwg o\'ch dosbarth heddiw.',
        classList: 'Rhestr Ddosbarth',
        upcomingAbsences: 'Absenoldebau i Ddod',
        upcomingAbsencesDesc: 'Absenoldebau a adroddwyd ar gyfer heddiw a dyddiadau\'r dyfodol.',
        noAbsences: 'Dim absenoldebau wedi\'u hadrodd ar gyfer eich dosbarth.',
        nameHeader: 'Enw',
        actionsHeader: 'Gweithredoedd',
        viewDetails: 'Gweld Manylion',
        notifyParent: 'Hysbysu Rhiant',
        childDetailsTitle: 'Manylion y Plentyn',
        childDetailsDesc: 'Gwybodaeth allweddol ar gyfer y myfyriwr hwn. Am fanylion llawn, cysylltwch â swyddfa\'r ysgol.',
        parentContactTitle: 'Cyswllt Rhiant/Gwarcheidwad',
        noParentsLinked: 'Dim rhieni wedi\'u cysylltu.',
        medicalTitle: 'Alergeddau a Meddygol',
        medicalNone: 'Dim alergeddau na chyflyrau meddygol hysbys.',
        profileTitle: 'Proffil Un Dudalen / CDU',
        profileView: 'Gweld y Ddogfen',
        profileNone: 'Dim dogfen proffil wedi\'i huwchlwytho.',
        reason: 'Rheswm',
        date: 'Dyddiad',
        awardSummaryTitle: 'Crynodeb Gwobrau Gwerthoedd',
        awardCountHeader: 'Gwobrau Eleni',
        awardDatesTitle: 'Dyddiadau Gwobrwyo ar gyfer {childName}',
        awardDatesDesc: 'Rhestr o ddyddiadau y derbyniodd y myfyriwr hwn Wobr Gwerthoedd.'
    }
}

function TeacherDashboardContent() {
    const { language } = useLanguage();
    const t = content[language];
    const [teacher, setTeacher] = useState<StaffMemberWithId | null>(null);
    const [myClass, setMyClass] = useState<ChildWithId[]>([]);
    const [absences, setAbsences] = useState<InboxMessageWithId[]>([]);
    const [awardCounts, setAwardCounts] = useState<Record<string, number>>({});
    const [awardDetails, setAwardDetails] = useState<Record<string, ParentNotificationWithId[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [selectedChild, setSelectedChild] = useState<ChildWithId | null>(null);
    const [selectedChildAwards, setSelectedChildAwards] = useState<ParentNotificationWithId[]>([]);
    const [isChildDetailOpen, setIsChildDetailOpen] = useState(false);
    const [isAwardDetailOpen, setIsAwardDetailOpen] = useState(false);
    const { toast } = useToast();
    const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    useEffect(() => {
        const fetchTeacherData = async () => {
            setIsLoading(true);
            try {
                let userId = 'mock-teacher-id-1'; // Default for non-supabase env
                if (isSupabaseConfigured) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) {
                        throw new Error("Not authenticated");
                    }
                    userId = session.user.id;
                }

                const teacherData = await db.getTeacherAndClass(userId);
                if (teacherData) {
                    setTeacher(teacherData.teacher);
                    setMyClass(teacherData.myClass);

                    // Fetch absences
                    const allAbsences = await db.getInboxMessages();
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const relevantAbsences = allAbsences.filter(msg => {
                        if (msg.type !== 'absence') return false;
                        const child = teacherData.myClass.find(c => msg.subject.includes(c.name));
                        if (!child) return false;
                        const absenceDate = new Date(msg.body.split('Date of Absence: ')[1]?.split('\n')[0]);
                        return absenceDate >= today;
                    });
                    setAbsences(relevantAbsences);

                    // Fetch awards data for each child
                    const counts: Record<string, number> = {};
                    const details: Record<string, ParentNotificationWithId[]> = {};
                    for (const child of teacherData.myClass) {
                        const awards = await db.getAwardsForChild(child.id);
                        counts[child.id] = awards.length;
                        details[child.id] = awards;
                    }
                    setAwardCounts(counts);
                    setAwardDetails(details);
                }
            } catch (error) {
                console.error("Error fetching teacher data:", error);
                toast({
                    title: "Error",
                    description: "Could not load your class data. Please try again.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };
        fetchTeacherData();
    }, [toast, isSupabaseConfigured]);

    const handleViewChild = (child: ChildWithId) => {
        setSelectedChild(child);
        setIsChildDetailOpen(true);
    };
    
    const handleViewAwards = (child: ChildWithId) => {
        setSelectedChild(child);
        setSelectedChildAwards(awardDetails[child.id] || []);
        setIsAwardDetailOpen(true);
    };

    if (isLoading) {
        return (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-48 w-full"/></CardContent></Card>
                </div>
                <Card><CardHeader><Skeleton className="h-6 w-48"/></CardHeader><CardContent><Skeleton className="h-32 w-full"/></CardContent></Card>
             </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                            <AccordionItem value="item-1" className="border-b-0">
                                <AccordionTrigger className="px-6 hover:no-underline">
                                    <CardHeader className="p-0 text-left">
                                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t.classList} ({myClass.length})</CardTitle>
                                    </CardHeader>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <CardContent className="pt-0">
                                        <div className="space-y-2">
                                            {myClass.map(child => (
                                                <div key={child.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 border rounded-md">
                                                    <p className="font-medium flex-grow">{child.name}</p>
                                                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto sm:shrink-0">
                                                        <Button variant="outline" size="sm" onClick={() => handleViewChild(child)} className="flex-1 sm:flex-none justify-center">
                                                            <Info className="mr-2 h-4 w-4" /> {t.viewDetails}
                                                        </Button>
                                                        <Button variant="default" size="sm" asChild className="flex-1 sm:flex-none justify-center">
                                                            <Link href={{ pathname: '/teacher/notify', query: { childId: child.id, childName: child.name } }}>
                                                                <MessageSquare className="mr-2 h-4 w-4" /> {t.notifyParent}
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> {t.awardSummaryTitle}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t.nameHeader}</TableHead>
                                        <TableHead className="text-right">{t.awardCountHeader}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myClass.map(child => (
                                        <TableRow key={child.id}>
                                            <TableCell className="font-medium">{child.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => handleViewAwards(child)} disabled={(awardCounts[child.id] || 0) === 0}>
                                                    {awardCounts[child.id] || 0}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {t.upcomingAbsences}</CardTitle>
                             <CardDescription>{t.upcomingAbsencesDesc}</CardDescription>
                        </CardHeader>
                        <CardContent>
                           {absences.length > 0 ? (
                            <div className="space-y-3">
                               {absences.map(absence => (
                                   <div key={absence.id} className="p-3 rounded-md border text-sm">
                                       <p className="font-semibold">{absence.subject.replace('Absence Report for ', '')}</p>
                                       <p className="text-muted-foreground">{t.date}: {format(new Date(absence.body.split('Date of Absence: ')[1]?.split('\n')[0]), 'dd MMM yyyy')}</p>
                                       <p className="text-muted-foreground mt-1">{t.reason}: {absence.body.split('Reason: ')[1]?.split('\n---')[0]}</p>
                                   </div>
                               ))}
                            </div>
                           ) : (
                               <p className="text-sm text-muted-foreground text-center py-4">{t.noAbsences}</p>
                           )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Dialog open={isChildDetailOpen} onOpenChange={setIsChildDetailOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedChild?.name}</DialogTitle>
                         <DialogDescription>{t.childDetailsDesc}</DialogDescription>
                    </DialogHeader>
                    {selectedChild && (
                       <ScrollArea className="max-h-[60vh] pr-4">
                           <div className="space-y-4 py-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> {t.parentContactTitle}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2 text-sm">
                                        {selectedChild.linkedParents && selectedChild.linkedParents.length > 0 ? (
                                            selectedChild.linkedParents.map(parentLink => (
                                                <div key={parentLink.parentId} className="p-2 bg-muted rounded-md">
                                                    <p className="font-semibold">{parentLink.relationship}</p>
                                                    <p className="text-muted-foreground">Contact details available from the office.</p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted-foreground">{t.noParentsLinked}</p>
                                        )}
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {t.medicalTitle}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                       <p className="text-muted-foreground">{selectedChild.allergies || t.medicalNone}</p>
                                    </CardContent>
                                </Card>
                                 <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> {t.profileTitle}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                       {selectedChild.onePageProfileUrl ? (
                                            <Button variant="outline" asChild>
                                                <a href={selectedChild.onePageProfileUrl} target="_blank" rel="noopener noreferrer">
                                                    <LinkIcon className="mr-2 h-4 w-4" /> {t.profileView}
                                                </a>
                                            </Button>
                                       ) : (
                                         <p className="text-sm text-muted-foreground">{t.profileNone}</p>
                                       )}
                                    </CardContent>
                                </Card>
                           </div>
                       </ScrollArea>
                    )}
                </DialogContent>
            </Dialog>
            <Dialog open={isAwardDetailOpen} onOpenChange={setIsAwardDetailOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t.awardDatesTitle.replace('{childName}', selectedChild?.name || '')}</DialogTitle>
                        <DialogDescription>{t.awardDatesDesc}</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-2 py-4">
                            {selectedChildAwards.length > 0 ? (
                                selectedChildAwards.map(award => (
                                    <div key={award.id} className="flex items-center gap-3 rounded-md border p-3">
                                        <Calendar className="h-5 w-5 text-primary" />
                                        <span className="text-sm font-medium">{format(new Date(award.date), 'EEEE, dd MMMM yyyy')}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No awards found.</p>
                            )}
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </>
    );
}


export default function TeacherDashboard() {
    const [teacherName, setTeacherName] = useState('');
    const { language } = useLanguage();
    const t = content[language];
    const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    useEffect(() => {
        const fetchTeacherName = async () => {
             if (isSupabaseConfigured) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    const teacherData = await db.getTeacherAndClass(session.user.id);
                    if (teacherData) {
                        setTeacherName(teacherData.teacher.name);
                    }
                } else {
                    setTeacherName('Teacher');
                }
             } else {
                 // Mock behavior
                 const teacherData = await db.getTeacherAndClass('mock-teacher-id-1');
                 if (teacherData) {
                     setTeacherName(teacherData.teacher.name);
                 } else {
                    setTeacherName('Teacher');
                 }
             }
        }
        fetchTeacherName();
    }, [isSupabaseConfigured]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">{t.myClass}</h1>
                <p className="text-muted-foreground">{t.welcome.replace('{name}', teacherName)}</p>
            </div>
             <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <TeacherDashboardContent />
            </Suspense>
        </div>
    );
}
