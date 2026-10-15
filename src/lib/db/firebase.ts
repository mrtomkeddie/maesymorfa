
import { collection, addDoc, getDocs, getDocsFromServer, getDocFromServer, runTransaction, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, setDoc, writeBatch, where, getDoc, limit, startAfter, count, getCountFromServer } from "firebase/firestore";
// News and calendar events use Firestore when a Firebase project is set up. The other
// sections below still return mock data.
import { db as firestoreDb, isFirebaseConfigured } from "../firebase/config";
import type { NewsPost } from "@/lib/mockNews";
import type { CalendarEvent } from "@/lib/mockCalendar";
import type { StaffMember, StaffMemberWithId, Document, DocumentWithId, Parent, ParentWithId, Child, ChildWithId, SiteSettings, LinkedParent, InboxMessage, InboxMessageWithId, Photo, PhotoWithId, DailyMenu, WeeklyMenu, UserWithRole, UserRole, ParentNotification, ParentNotificationWithId } from "@/lib/types";
import { yearGroups } from "@/components/admin/ChildForm";
import { QueryDocumentSnapshot } from "firebase/firestore";
import { news as mockNewsData } from '@/lib/mockNews';
import { calendarEvents as mockCalendarEvents } from '@/lib/mockCalendar';
import { generateMockData, parentChildren } from '@/lib/mockData';
import { weekMenuFor } from '@/lib/lunchMenu';

// === NEWS ===
// Real posts live in the "news" collection in Firestore and are added in the admin area.
// Until the school saves its first post, the site shows the built-in sample stories so the
// pages are never empty. Saving the first real post also sets site/content.newsStarted, after
// which the samples never come back, even if every real post is later deleted.
// With no Firebase project at all (local preview), everything stays in memory as before.
export type NewsPostWithId = NewsPost & { id: string };

const NEWS = 'news';
const CALENDAR = 'calendarEvents';
const CONTENT_FLAGS = ['site', 'content'] as const;

const generateMockNews = () => mockNewsData.map((post, index) => ({
    ...post,
    id: `mock_news_${index}`,
}));

let mockNewsStore = generateMockNews();

// Firestore refuses fields set to undefined
const withoutUndefined = <T extends object>(data: T) =>
    Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;

const newsFrom = (snap: { docs: QueryDocumentSnapshot[] }) =>
    snap.docs.map((d) => ({ ...(d.data() as NewsPost), id: d.id }));

const slugify = (title: string) =>
    title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

// Site-wide state in site/content: whether the school has started adding its own news and
// events (see the note at the top), and which post is the homepage banner. Keeping the banner
// as one shared value means the latest save always wins, even if two admins save at once.
export type SiteContent = { news: boolean; events: boolean; urgentNewsId: string | null };

export const getSiteContent = async (): Promise<SiteContent> => {
    if (!isFirebaseConfigured) {
        return { news: false, events: false, urgentNewsId: mockNewsStore.find((p) => p.isUrgent)?.id ?? null };
    }
    const data = (await getDocFromServer(doc(firestoreDb, ...CONTENT_FLAGS))).data();
    return {
        news: data?.newsStarted === true,
        events: data?.eventsStarted === true,
        urgentNewsId: typeof data?.urgentNewsId === 'string' ? data.urgentNewsId : null,
    };
};

export const getContentStarted = async () => {
    const { news, events } = await getSiteContent();
    return { news, events };
};

// Only one post can carry the red homepage banner at a time
async function clearOtherUrgentNews(batch: ReturnType<typeof writeBatch>, keepId: string) {
    const snap = await getDocs(query(collection(firestoreDb, NEWS), where('isUrgent', '==', true)));
    snap.docs.filter((d) => d.id !== keepId).forEach((d) => batch.update(d.ref, { isUrgent: false }));
}

// Published posts, for the public site. Reads from the server (never a stale or empty cache)
// and lets errors through, so a failed read is never mistaken for "no news".
export const getNews = async (): Promise<NewsPostWithId[]> => {
    if (!isFirebaseConfigured) return mockNewsStore;
    const posts = newsFrom(await getDocsFromServer(query(collection(firestoreDb, NEWS), where('published', '==', true))));
    if (posts.length > 0) return posts;
    return (await getContentStarted()).news ? [] : generateMockNews();
};

// One published post by its web address, for the full story page. Null when there is none.
export const getNewsBySlug = async (slug: string): Promise<NewsPostWithId | null> => {
    if (!isFirebaseConfigured) return mockNewsStore.find((p) => p.slug === slug) ?? null;
    const snap = await getDocsFromServer(query(collection(firestoreDb, NEWS), where('published', '==', true), where('slug', '==', slug), limit(1)));
    if (!snap.empty) return newsFrom(snap)[0];
    if ((await getContentStarted()).news) return null;
    return generateMockNews().find((p) => p.slug === slug) ?? null;
};

// Every post, drafts included, for the admin area. Only signed-in school admins can read these.
export const getAllNews = async (): Promise<NewsPostWithId[]> => {
    if (!isFirebaseConfigured) return mockNewsStore;
    return newsFrom(await getDocsFromServer(collection(firestoreDb, NEWS)));
};

type NewNews = Omit<NewsPost, 'id' | 'attachments' | 'slug'>;
type NewEvent = Omit<CalendarEvent, 'id' | 'attachments'>;

// Saves a new announcement: a calendar event, a news post, or both. Everything (including the
// banner rule and the "started" flags) is written in one go, so it either all saves or none of it does.
export const createAnnouncement = async ({ event, news }: { event?: NewEvent; news?: NewNews }): Promise<void> => {
    if (!isFirebaseConfigured) {
        if (news) {
            if (news.isUrgent) mockNewsStore.forEach(post => post.isUrgent = false);
            mockNewsStore.unshift({ ...news, id: `mock_news_${Date.now()}`, slug: slugify(news.title_en), attachments: [] } as NewsPostWithId);
        }
        if (event) console.log("Mock addCalendarEvent:", event);
        return;
    }
    const batch = writeBatch(firestoreDb);
    let newsId: string | null = null;
    if (event) {
        batch.set(doc(collection(firestoreDb, CALENDAR)), withoutUndefined(event));
    }
    if (news) {
        const ref = doc(collection(firestoreDb, NEWS));
        if (news.isUrgent) await clearOtherUrgentNews(batch, ref.id);
        // Ending with the post's own ID keeps every web address unique, even when two posts share a title
        const slug = `${slugify(news.title_en) || 'news'}-${ref.id}`;
        batch.set(ref, withoutUndefined({ ...news, slug, attachments: [] }));
        newsId = ref.id;
    }
    batch.set(doc(firestoreDb, ...CONTENT_FLAGS), {
        ...(news ? { newsStarted: true } : {}),
        ...(event ? { eventsStarted: true } : {}),
        ...(news?.isUrgent ? { urgentNewsId: newsId } : {}),
    }, { merge: true });
    await batch.commit();
};

export const addNews = (newsData: NewNews) => createAnnouncement({ news: newsData });

export const updateNews = async (id: string, newsData: Partial<Omit<NewsPost, 'id' | 'attachments'>>) => {
    // The web address stays the same when a title is edited, so shared links keep working
    const { slug: _slug, ...changes } = newsData;
    if (!isFirebaseConfigured) {
        if (changes.isUrgent) {
            mockNewsStore.forEach(post => {
                if (post.id !== id) post.isUrgent = false;
            });
        }
        const index = mockNewsStore.findIndex(p => p.id === id);
        if (index !== -1) {
            mockNewsStore[index] = { ...mockNewsStore[index], ...changes };
        }
        return;
    }
    if (changes.isUrgent) {
        const batch = writeBatch(firestoreDb);
        await clearOtherUrgentNews(batch, id);
        batch.set(doc(firestoreDb, ...CONTENT_FLAGS), { urgentNewsId: id }, { merge: true });
        batch.update(doc(firestoreDb, NEWS, id), withoutUndefined(changes));
        await batch.commit();
        return;
    }
    // Clearing the banner checks and clears in one step; if another admin sets a new banner
    // at the same moment, Firestore runs this again and leaves their banner alone
    await runTransaction(firestoreDb, async (tx) => {
        const contentRef = doc(firestoreDb, ...CONTENT_FLAGS);
        const site = await tx.get(contentRef);
        if (changes.isUrgent === false && site.data()?.urgentNewsId === id) {
            tx.set(contentRef, { urgentNewsId: null }, { merge: true });
        }
        tx.update(doc(firestoreDb, NEWS, id), withoutUndefined(changes));
    });
};

export const deleteNews = async (id: string) => {
    if (!isFirebaseConfigured) {
        mockNewsStore = mockNewsStore.filter(p => p.id !== id);
        return;
    }
    // Same one-step check as updateNews, so a banner set by someone else meanwhile is kept
    await runTransaction(firestoreDb, async (tx) => {
        const contentRef = doc(firestoreDb, ...CONTENT_FLAGS);
        const site = await tx.get(contentRef);
        if (site.data()?.urgentNewsId === id) {
            tx.set(contentRef, { urgentNewsId: null }, { merge: true });
        }
        tx.delete(doc(firestoreDb, NEWS, id));
    });
};

export const getPaginatedNews = async (limitNum = 20, lastDoc?: any): Promise<{ data: NewsPostWithId[], lastDoc?: any }> => {
    console.log('Using mock getPaginatedNews');
    const allNews = mockNewsStore;
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const start = page * limitNum;
    const end = start + limitNum;
    const data = allNews.slice(start, end);
    const nextLastDoc = end < allNews.length ? { page } : undefined;
    return Promise.resolve({ data, lastDoc: nextLastDoc });
};

// === CALENDAR ===
// Same pattern as news: real events in the "calendarEvents" collection, sample events until the first one.
export type CalendarEventWithId = CalendarEvent & { id: string };

const generateMockCalendarEvents = () => mockCalendarEvents.map((event, index) => ({
    ...event,
    id: `mock_cal_${index}`,
}));

const eventsFrom = (snap: { docs: QueryDocumentSnapshot[] }) =>
    snap.docs.map((d) => ({ ...(d.data() as CalendarEvent), id: d.id }));

// Published events, for the public site and the phone calendar feed. Errors are let through
// (see getNews), so the feed never sends phones an empty calendar by mistake.
export const getCalendarEvents = async (): Promise<CalendarEventWithId[]> => {
    if (!isFirebaseConfigured) return generateMockCalendarEvents();
    const events = eventsFrom(await getDocsFromServer(query(collection(firestoreDb, CALENDAR), where('published', '==', true))));
    if (events.length > 0) return events;
    return (await getContentStarted()).events ? [] : generateMockCalendarEvents();
};

// Every event, for the admin area. Only signed-in school admins can read these.
export const getAllCalendarEvents = async (): Promise<CalendarEventWithId[]> => {
    if (!isFirebaseConfigured) return generateMockCalendarEvents();
    return eventsFrom(await getDocsFromServer(collection(firestoreDb, CALENDAR)));
};

export const addCalendarEvent = (eventData: NewEvent, _crossPost?: boolean) => createAnnouncement({ event: eventData });

export const updateCalendarEvent = async (id: string, eventData: Partial<Omit<CalendarEvent, 'id' | 'attachments'>>, crossPost: boolean) => {
    if (!isFirebaseConfigured) {
        console.log(`Mock updateCalendarEvent (id: ${id}):`, eventData, `Cross-post: ${crossPost}`);
        return;
    }
    await updateDoc(doc(firestoreDb, CALENDAR, id), withoutUndefined(eventData));
};

export const deleteCalendarEvent = async (id: string) => {
    if (!isFirebaseConfigured) {
        console.log(`Mock deleteCalendarEvent (id: ${id})`);
        return;
    }
    await deleteDoc(doc(firestoreDb, CALENDAR, id));
};

export const getPaginatedCalendarEvents = async (limitNum = 20, lastDoc?: any): Promise<{ data: CalendarEventWithId[], lastDoc?: any }> => {
    console.log('Using mock getPaginatedCalendarEvents');
    const allEvents = generateMockCalendarEvents();
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const start = page * limitNum;
    const end = start + limitNum;
    const data = allEvents.slice(start, end);
    const nextLastDoc = end < allEvents.length ? { page } : undefined;
    return Promise.resolve({ data, lastDoc: nextLastDoc });
};

// === STAFF ===
const { mockParents: allMockParents, mockChildren: allMockChildren } = generateMockData();
const mockStaff: StaffMemberWithId[] = [
    { id: '1', name: 'Jane Morgan', role: 'Headteacher', team: 'Leadership Team', email: 'jane.morgan@example.com', userId: 'mock-admin-id-1' },
    { id: '2', name: 'Alex Evans', role: 'Deputy Head', team: 'Leadership Team', email: 'alex.evans@example.com' },
    { id: '3', name: 'David Williams', role: 'Teacher', team: 'Year 6', email: 'david.williams@example.com', userId: 'mock-teacher-id-1' },
];

export const getStaff = async (): Promise<StaffMemberWithId[]> => {
    return Promise.resolve(mockStaff);
}
export const addStaffMember = async (staffData: StaffMember): Promise<string> => {
    console.log("Mock addStaffMember:", staffData);
    const newId = `mock_staff_${Date.now()}`;
    mockStaff.push({ ...staffData, id: newId });
    return Promise.resolve(newId);
};
export const updateStaffMember = async (id: string, staffData: Partial<StaffMember>) => {
    console.log(`Mock updateStaffMember (id: ${id}):`, staffData);
}
export const deleteStaffMember = async (id: string) => {
    console.log(`Mock deleteStaffMember (id: ${id})`);
}
export const getPaginatedStaff = async (limitNum = 20, lastDoc?: any): Promise<{ data: StaffMemberWithId[], lastDoc?: any }> => {
    return Promise.resolve({ data: mockStaff, lastDoc: undefined });
};

export const getTeacherAndClass = async (userId: string): Promise<{ teacher: StaffMemberWithId, myClass: ChildWithId[] } | null> => {
    const teacher = mockStaff.find(s => s.userId === userId);
    if (!teacher) {
        return null;
    }
    const myClass = allMockChildren.filter(c => c.yearGroup === teacher.team);
    return Promise.resolve({ teacher, myClass });
}

// === DOCUMENTS ===
const mockDocuments: DocumentWithId[] = [
    { id: '1', title: 'Term Dates 2024-2025', category: 'Term Dates', fileUrl: '#', uploadedAt: new Date().toISOString() },
    { id: '2', title: 'Uniform Policy', category: 'Uniform', fileUrl: '#', uploadedAt: new Date().toISOString() },
    { id: '3', title: 'Lunch Menu - Autumn Term', category: 'Lunch Menu', fileUrl: '#', uploadedAt: new Date().toISOString() },
];
export const getDocuments = async (): Promise<DocumentWithId[]> => Promise.resolve(mockDocuments);
export const addDocument = async (docData: Document) => console.log("Mock addDocument", docData);
export const updateDocument = async (id: string, docData: Partial<Document>) => console.log("Mock updateDocument", id, docData);
export const deleteDocument = async (id: string) => console.log("Mock deleteDocument", id);
export const getPaginatedDocuments = async (limitNum = 20, lastDoc?: any): Promise<{ data: DocumentWithId[], lastDoc?: any }> => {
    return Promise.resolve({ data: mockDocuments, lastDoc: undefined });
};

// === PARENTS ===
export const getParents = async (): Promise<ParentWithId[]> => Promise.resolve(allMockParents);
export const getParentById = async (id: string): Promise<ParentWithId | null> => {
    const parent = allMockParents.find(p => p.id === id);
    return Promise.resolve(parent || null);
};
export const addParent = async (parentData: Parent): Promise<string> => {
    console.log("Mock addParent", parentData);
    return `mock_parent_${Date.now()}`;
};
export const updateParent = async (id: string, parentData: Partial<Parent>) => console.log("Mock updateParent", id, parentData);
export const deleteParent = async (id: string) => console.log("Mock deleteParent", id);
export const getPaginatedParents = async (limitNum = 20, lastDoc?: any): Promise<{ data: ParentWithId[], lastDoc?: any }> => {
    return Promise.resolve({ data: allMockParents, lastDoc: undefined });
};

// === CHILDREN ===
export const getChildren = async (): Promise<ChildWithId[]> => Promise.resolve(allMockChildren);
export const getChildrenByYearGroup = async (yearGroup: string): Promise<ChildWithId[]> => {
    return Promise.resolve(allMockChildren.filter(c => c.yearGroup === yearGroup));
};
export const addChild = async (childData: Child) => console.log("Mock addChild", childData);
export const bulkAddChildren = async (childrenData: Child[]) => console.log("Mock bulkAddChildren", childrenData.length);
export const updateChild = async (id: string, childData: Partial<Child>) => console.log("Mock updateChild", id, childData);
export const deleteChild = async (id: string) => console.log("Mock deleteChild", id);

export const promoteAllChildren = async (): Promise<void> => {
    console.log("Mock promoting all children...");
    const leaversYear = new Date().getFullYear() + 1;
    const archiveLabel = `Archived/Leavers ${leaversYear}`;

    allMockChildren.forEach(child => {
        const currentYearIndex = yearGroups.indexOf(child.yearGroup);
        if (child.yearGroup === yearGroups[yearGroups.length - 1]) {
            child.yearGroup = archiveLabel;
        } else if (currentYearIndex > -1) {
            child.yearGroup = yearGroups[currentYearIndex + 1];
        }
    });
    console.log("Mock children promoted.");

    return Promise.resolve();
};

export const bulkUpdateChildren = async (ids: string[], data: Partial<Child>) => console.log("Mock bulkUpdateChildren", ids, data);
export const getPaginatedChildren = async (limitNum = 20, lastDoc?: any): Promise<{ data: ChildWithId[], lastDoc?: any }> => {
    return Promise.resolve({ data: allMockChildren, lastDoc: undefined });
};

// === SITE SETTINGS ===
const mockSiteSettings: SiteSettings = {
    address: "Ysgol Maes Y Morfa,\nOlive St,\nLlanelli\nSA15 2AP",
    phone: "01554 772945",
    email: "admin@maesymorfa.cymru",
    facebookUrl: 'https://facebook.com',
    twitterUrl: 'https://twitter.com',
    instagramUrl: '',
    youtubeUrl: '',
};
export const getSiteSettings = async (): Promise<SiteSettings | null> => Promise.resolve(mockSiteSettings);
export const updateSiteSettings = async (settings: SiteSettings) => console.log("Mock updateSiteSettings", settings);


// === LUNCH MENU SETTINGS ===
// The real council menu for this school week (see src/lib/lunchMenu.ts)
export const getWeeklyMenu = async (): Promise<WeeklyMenu | null> => {
    const week = weekMenuFor(new Date());
    if (!week) return null;
    return Object.fromEntries(
        Object.entries(week.days).map(([day, d]) => [day, { main: d.main, alt: d.vegetarian, dessert: d.dessert }])
    );
};
export const updateWeeklyMenu = async (menu: WeeklyMenu) => console.log("Mock updateWeeklyMenu", menu);


// === INBOX ===
let mockInbox: InboxMessageWithId[] = [
    {
        id: '1',
        type: 'absence',
        subject: 'Absence Report for Charlie K.',
        body: 'Charlie is unwell today.',
        sender: { id: 'parent-1', name: 'Jane Doe', email: 'parent@example.com', type: 'parent' },
        recipient: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', type: 'admin' },
        isReadByAdmin: false,
        isReadByParent: true,
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        threadId: 'thread-1',
    },
    {
        id: 'reply-1',
        type: 'reply',
        subject: 'Re: Absence Report for Charlie K.',
        body: 'Thank you for letting us know. We hope Charlie feels better soon.',
        sender: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', type: 'admin' },
        recipient: { id: 'parent-1', name: 'Jane Doe', email: 'parent@example.com', type: 'parent' },
        isReadByAdmin: true,
        isReadByParent: false,
        createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        threadId: 'thread-1',
    },
    {
        id: '2',
        type: 'contact',
        subject: 'Question about school trip',
        body: 'When is the payment due?',
        sender: { id: 'parent-2', name: 'John Smith', email: 'john@example.com', type: 'parent' },
        recipient: { id: 'admin-1', name: 'Admin', email: 'admin@example.com', type: 'admin' },
        isReadByAdmin: true,
        isReadByParent: true,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        threadId: 'thread-2',
    },
];

export const addInboxMessage = async (messageData: Omit<InboxMessage, 'id'>): Promise<string> => {
    console.log("Mock addInboxMessage", messageData);
    const newMessage: InboxMessageWithId = {
        ...messageData,
        id: `mock_inbox_${Date.now()}`,
    } as InboxMessageWithId;
    mockInbox.push(newMessage);
    return newMessage.id;
}
export const getInboxMessages = async (): Promise<InboxMessageWithId[]> => Promise.resolve(mockInbox);
export const getInboxMessagesForUser = async (userId: string): Promise<InboxMessageWithId[]> => {
    return Promise.resolve(mockInbox.filter(m => m.recipient?.id === userId || m.sender?.id === userId));
}
export const updateInboxMessage = async (id: string, data: Partial<InboxMessage>) => {
    console.log("Mock updateInboxMessage", id, data);
    const index = mockInbox.findIndex(m => m.id === id);
    if (index > -1) {
        mockInbox[index] = { ...mockInbox[index], ...data };
    }
};
export const deleteInboxMessage = async (id: string) => {
    console.log("Mock deleteInboxMessage", id);
    mockInbox = mockInbox.filter(m => m.id !== id);
}
export const getUnreadMessageCount = async (userId: string, userType: 'admin' | 'parent'): Promise<number> => {
    if (userType === 'admin') {
        return Promise.resolve(mockInbox.filter(m => !m.isReadByAdmin).length);
    } else {
        return Promise.resolve(mockInbox.filter(m => m.recipient?.id === userId && !m.isReadByParent).length);
    }
};

// === NOTIFICATIONS ===
let mockNotifications: ParentNotificationWithId[] = [
    { id: 'notif-1', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'Achievement', notes: 'Received a values certificate for kindness!', date: new Date(Date.now() - 86400000 * 1).toISOString(), isRead: false },
    { id: 'notif-2', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'Incident', notes: 'Bumped head in the playground.', treatmentGiven: 'Cold compress applied.', date: new Date(Date.now() - 86400000 * 3).toISOString(), isRead: true },
    // Charlie K. (Year 2) has 3 awards
    { id: 'notif-3', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'Ms. Hughes', type: 'Values Award', notes: 'Values award for being helpful!', date: new Date(Date.now() - 86400000 * 7).toISOString(), isRead: true },
    { id: 'notif-5', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'Mr. Evans', type: 'Values Award', notes: 'Values award for great listening!', date: new Date(Date.now() - 86400000 * 14).toISOString(), isRead: true },
    { id: 'notif-6', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'Mr. Evans', type: 'Values Award', notes: 'Values award for excellent teamwork!', date: new Date(Date.now() - 86400000 * 21).toISOString(), isRead: true },
    { id: 'notif-12', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'Ms. Hughes', type: 'Achievement', notes: 'Star of the Week for consistent effort!', date: new Date(Date.now() - 86400000 * 25).toISOString(), isRead: true },
    { id: 'notif-13', parentId: 'parent-1', childId: 'child_1', childName: 'Charlie K.', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'General', notes: 'Reminder: PE Kit needed tomorrow.', date: new Date(Date.now() - 86400000 * 2).toISOString(), isRead: false },
    // Sophie K. (Year 5) has 2 awards
    { id: 'notif-4', parentId: 'parent-1', childId: 'child_2', childName: 'Sophie K.', teacherId: 'mock-teacher-id-1', teacherName: 'Ms. Hughes', type: 'Values Award', notes: 'Values award for great teamwork!', date: new Date(Date.now() - 86400000 * 8).toISOString(), isRead: true },
    { id: 'notif-7', parentId: 'parent-1', childId: 'child_2', childName: 'Sophie K.', teacherId: 'mock-teacher-id-1', teacherName: 'Ms. Hughes', type: 'Values Award', notes: 'Values award for trying her best!', date: new Date(Date.now() - 86400000 * 30).toISOString(), isRead: true },
    // Year 6 students awards for Teacher Dashboard
    { id: 'notif-8', parentId: 'mock_parent_8', childId: 'mock_child_8', childName: 'Elin Evans', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'Values Award', notes: 'Award for being a kind friend.', date: new Date(Date.now() - 86400000 * 4).toISOString(), isRead: true },
    { id: 'notif-9', parentId: 'mock_parent_16', childId: 'mock_child_16', childName: 'Ava Davis', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'Values Award', notes: 'Award for excellent focus in class.', date: new Date(Date.now() - 86400000 * 5).toISOString(), isRead: true },
    { id: 'notif-10', parentId: 'mock_parent_16', childId: 'mock_child_16', childName: 'Ava Davis', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'Values Award', notes: 'Award for a brilliant science project.', date: new Date(Date.now() - 86400000 * 20).toISOString(), isRead: true },
    { id: 'notif-11', parentId: 'mock_parent_20', childId: 'mock_child_24', childName: 'Mia Rodriguez', teacherId: 'mock-teacher-id-1', teacherName: 'David Williams', type: 'Values Award', notes: 'Award for always trying her best.', date: new Date(Date.now() - 86400000 * 6).toISOString(), isRead: true },
];

export const addParentNotification = async (notificationData: ParentNotification): Promise<string> => {
    console.log("Mock addParentNotification", notificationData);
    const newNotif = { ...notificationData, id: `mock_notif_${Date.now()}` };
    mockNotifications.push(newNotif);
    return newNotif.id;
};

export const getParentNotifications = async (): Promise<ParentNotificationWithId[]> => {
    return Promise.resolve(mockNotifications);
}

export const getNotificationsForParent = async (parentId: string): Promise<ParentNotificationWithId[]> => {
    return Promise.resolve(mockNotifications.filter(n => n.parentId === parentId));
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    console.log("Mock markNotificationAsRead", notificationId);
    const index = mockNotifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
        mockNotifications[index].isRead = true;
    }
}

export const getValuesAwardCount = async (childId: string): Promise<number> => {
    return Promise.resolve(mockNotifications.filter(n => n.childId === childId && n.type === 'Values Award').length);
};

export const getAwardsForChild = async (childId: string): Promise<ParentNotificationWithId[]> => {
    return Promise.resolve(mockNotifications.filter(n => n.childId === childId && n.type === 'Values Award'));
}


// === GALLERY ===
const mockPhotos: PhotoWithId[] = [
    { id: '1', caption: 'Sports Day 2024!', imageUrl: 'https://placehold.co/400x400.png', yearGroups: ['All'], uploadedAt: new Date().toISOString(), uploadedBy: 'admin' },
    { id: '2', caption: 'Year 3 building volcanoes', imageUrl: 'https://placehold.co/400x400.png', yearGroups: ['Year 3'], uploadedAt: new Date().toISOString(), uploadedBy: 'admin' },
];
export const addPhoto = async (photoData: Photo): Promise<string> => {
    console.log("Mock addPhoto", photoData);
    return `mock_photo_${Date.now()}`;
}
export const deletePhoto = async (id: string) => console.log("Mock deletePhoto", id);
export const getPaginatedPhotos = async (limitNum = 20, lastDoc?: any): Promise<{ data: PhotoWithId[], lastDoc?: any }> => {
    return Promise.resolve({ data: mockPhotos, lastDoc: undefined });
};
export const getPhotosForYearGroups = async (yearGroups: string[]): Promise<PhotoWithId[]> => {
    return Promise.resolve(mockPhotos.filter(p => p.yearGroups.includes('All') || p.yearGroups.some(yg => yearGroups.includes(yg))));
};

// === USER MANAGEMENT ===
// This is now a mutable, in-memory store to simulate role changes for demos.
let mockUsers: UserWithRole[] = [
    { id: 'mock-admin-id-1', email: 'main.admin@example.com', role: 'admin', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: 'mock-teacher-id-1', email: 'teacher@example.com', role: 'teacher', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
    { id: 'mock-parent-id-1', email: 'parent.one@example.com', role: 'parent', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: 'mock-parent-id-2', email: 'parent.two@example.com', role: 'parent', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
];
export const getUsersWithRoles = async (): Promise<UserWithRole[]> => Promise.resolve(mockUsers);
export const updateUserRole = async (userId: string, role: UserRole): Promise<void> => {
    console.log("Mock updateUserRole", userId, role);
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
        mockUsers[userIndex].role = role;
    }
};

export const createUser = async (email: string, role: UserRole) => {
    console.log(`Mock: Creating user for ${email} with role ${role}`);
    const newUser = {
        id: `mock-user-${Date.now()}`,
        email: email,
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: role,
    };
    mockUsers.push({ id: newUser.id, email: newUser.email, role: role, created_at: newUser.created_at });
    return Promise.resolve({ user: newUser, data: { user: newUser } as any });
};


// === UTILITIES ===
export const getCollectionCount = async (collectionName: string): Promise<number> => {
    switch (collectionName) {
        case 'children': return Promise.resolve(allMockChildren.length);
        case 'parents': return Promise.resolve(allMockParents.length);
        case 'documents': return Promise.resolve(mockDocuments.length);
        default: return Promise.resolve(0);
    }
}
