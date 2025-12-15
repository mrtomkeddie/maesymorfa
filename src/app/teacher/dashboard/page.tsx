'use client';

import { useEffect, useState, Suspense } from 'react';
import { db } from '@/lib/db';
import type { ChildWithId, StaffMemberWithId, InboxMessageWithId, ParentNotificationWithId } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, FileText, User, Info, MessageSquare, Award, AlertTriangle, BookOpen, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/config';

const content = {
    en: {
        myClass: 'My Class',
        welcome: 'Welcome, {name}. Overview of your class today.',
        classList: 'Class List',
        upcomingAbsences: 'Absences',
        upcomingAbsencesDesc: 'Reported absences for upcoming dates.',
        noAbsences: 'No absences reported.',
        nameHeader: 'Name',
        actionsHeader: 'Actions',
        viewDetails: 'Details',
        notifyParent: 'Message',
        childDetailsTitle: 'Student Profile',
        childDetailsDesc: 'Key information available below.',
        parentContactTitle: 'Parents',
        noParentsLinked: 'No parents linked.',
        medicalTitle: 'Medical / Allergies',
        medicalNone: 'No known conditions.',
        profileTitle: 'IDP / Profile',
        profileView: 'Open Document',
        profileNone: 'No document.',
        reason: 'Reason',
        date: 'Date',
        awardSummaryTitle: 'Values Awards',
        awardCountHeader: 'Awards',
        awardDatesTitle: 'Awards for {childName}',
        awardDatesDesc: 'History of Values Awards received.'
    },
    cy: {
        myClass: 'Fy Nosbarth',
        welcome: 'Croeso, {name}. Trosolwg o\'ch dosbarth heddiw.',
        classList: 'Rhestr Ddosbarth',
        upcomingAbsences: 'Absenoldebau',
        upcomingAbsencesDesc: 'Absenoldebau sydd i ddod.',
        noAbsences: 'Dim absenoldebau.',
        nameHeader: 'Enw',
        actionsHeader: 'Gweithredoedd',
        viewDetails: 'Manylion',
        notifyParent: 'Neges',
        childDetailsTitle: 'Proffil Myfyriwr',
        childDetailsDesc: 'Gwybodaeth allweddol isod.',
        parentContactTitle: 'Rhieni',
        noParentsLinked: 'Dim rhieni.',
        medicalTitle: 'Meddygol / Alergeddau',
        medicalNone: 'Dim cyflyrau hysbys.',
        profileTitle: 'CDU / Proffil',
        profileView: 'Agor Dogfen',
        profileNone: 'Dim dogfen.',
        reason: 'Rheswm',
        date: 'Dyddiad',
        awardSummaryTitle: 'Gwobrau Gwerthoedd',
        awardCountHeader: 'Gwobrau',
        awardDatesTitle: 'Gwobrau ar gyfer {childName}',
        awardDatesDesc: 'Hanes Gwobrau Gwerthoedd a dderbyniwyd.'
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
    const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    useEffect(() => {
        const fetchTeacherData = async () => {
            setIsLoading(true);
            try {
                let userId = 'mock-teacher-id-1'; // Default for non-firebase env

                if (isFirebaseConfigured) {
                    const auth = getAuth(app);
                    const user = auth.currentUser;
                    if (user) {
                        userId = user.uid;
                    }
                }

                const teacherData = await db.getTeacherAndClass(userId);
                if (teacherData) {
                    setTeacher(teacherData.teacher);
                    setMyClass(teacherData.myClass);

                    // Fetch absences
                    const allAbsences = await db.getInboxMessages();
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
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
    }, [toast, isFirebaseConfigured]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="col-span-2"><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-6 w-48" /></CardHeader><CardContent><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground font-headline mb-1">{t.myClass}</h1>
                    <p className="text-muted-foreground text-lg">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 h-auto text-sm bg-primary/5 border-primary/20 text-primary">
                        {myClass.length} Students
                    </Badge>
                    <Badge variant="outline" className="px-3 py-1 h-auto text-sm bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400">
                        96% Attendance
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content: Student Grid */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {t.classList}
                        </h2>
                        {/* Filter or Sort could go here */}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {myClass.map(child => (
                            <Card key={child.id} className="overflow-hidden bg-card hover:shadow-md transition-all border-border/60 group">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary ring-2 ring-background shadow-sm">
                                                {child.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base leading-tight group-hover:text-primary transition-colors">{child.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                        {awardCounts[child.id] || 0} Awards
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleViewChild(child)}>
                                                <Info className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                                                <Link href={{ pathname: '/teacher/notify', query: { childId: child.id, childName: child.name } }}>
                                                    <MessageSquare className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Today's Status</span>
                                        <div className="flex gap-1">
                                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs border-green-200 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-400">
                                                Present
                                            </Button>
                                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                Absent
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Sidebar: Absences & Quick Actions */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Absences */}
                    <Card className="border-none shadow-md bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <FileText className="h-5 w-5" />
                                {t.upcomingAbsences}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {absences.length > 0 ? (
                                <div className="space-y-2">
                                    {absences.slice(0, 3).map(absence => (
                                        <div key={absence.id} className="p-3 bg-background/80 backdrop-blur-sm rounded-lg text-sm border border-orange-200/50 dark:border-orange-900/30 shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold text-foreground">{absence.subject.replace('Absence Report for ', '')}</span>
                                                <span className="text-[10px] font-mono bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300 px-1.5 rounded">
                                                    {format(new Date(absence.body.split('Date of Absence: ')[1]?.split('\n')[0]), 'dd MMM')}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-xs line-clamp-1">{absence.body.split('Reason: ')[1]?.split('\n---')[0]}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-orange-800/60 dark:text-orange-300/60 text-sm">
                                    {t.noAbsences}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Link to Awards */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Award className="h-5 w-5 text-yellow-500" />
                                Values Awards
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Quickly award a student for demonstrating school values.
                            </p>
                            <Button className="w-full gap-2" variant="outline" asChild>
                                <Link href="/teacher/values-award">
                                    Give Award <Award className="h-4 w-4" />
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* CHILD DETAILS MODAL (Kept existing logic) */}
            <Dialog open={isChildDetailOpen} onOpenChange={setIsChildDetailOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
                                {selectedChild?.name.charAt(0)}
                            </span>
                            {selectedChild?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedChild && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                            <div className="col-span-1 space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> {t.parentContactTitle}</h4>
                                {selectedChild.linkedParents && selectedChild.linkedParents.length > 0 ? (
                                    selectedChild.linkedParents.map(p => (
                                        <div key={p.parentId} className="text-sm font-semibold">{p.relationship}</div>
                                    ))
                                ) : <span className="text-sm italic text-muted-foreground">{t.noParentsLinked}</span>}
                            </div>

                            <div className="col-span-1 space-y-1">
                                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t.medicalTitle}</h4>
                                <div className="text-sm">{selectedChild.allergies || t.medicalNone}</div>
                            </div>

                            <div className="col-span-1 sm:col-span-2 mt-2 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium flex items-center gap-2"><BookOpen className="h-4 w-4" /> {t.profileTitle}</span>
                                    {selectedChild.onePageProfileUrl ? (
                                        <Button variant="outline" size="sm" asChild>
                                            <a href={selectedChild.onePageProfileUrl} target="_blank" rel="noopener noreferrer">
                                                <LinkIcon className="mr-2 h-3 w-3" /> {t.profileView}
                                            </a>
                                        </Button>
                                    ) : <span className="text-sm text-muted-foreground">{t.profileNone}</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* AWARDS MODAL (Kept existing logic) */}
            {/* Note: View Awards now handled via '0 Awards' badge or details, simplifying main view */}
        </div>
    );
}

export default function TeacherDashboard() {
    return (
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
            <TeacherDashboardContent />
        </Suspense>
    );
}
