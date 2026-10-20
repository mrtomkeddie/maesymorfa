
import { collection, addDoc, getDocs, getDocsFromServer, getDocFromServer, runTransaction, doc, updateDoc, deleteDoc, deleteField, query, orderBy, serverTimestamp, setDoc, writeBatch, where, getDoc, limit, startAfter, count, getCountFromServer } from "firebase/firestore";
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
import { cleanLunchMenu, weekMenuFor, type LunchMenu, type LunchMenuWithId } from '@/lib/lunchMenu';

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

type NewNews = Omit<NewsPost, 'id' | 'attachments' | 'attachmentUrl' | 'attachmentName' | 'slug' | 'createdBy' | 'eventId' | 'eventStart' | 'eventEnd'>;
type NewEvent = Omit<CalendarEvent, 'id' | 'attachments' | 'attachmentUrl' | 'attachmentName' | 'newsId' | 'newsSlug'>;

// === ONE FORM FOR NEWS AND EVENTS ===
// The admin area has one form. Every post goes in "news". A post with a day also gets a calendar
// entry, which shows under Upcoming Events and on parents' phones. The two are linked both ways
// (news.eventId and event.newsId), and the post keeps a copy of the day or days (news.eventStart,
// news.eventEnd for a last day) so its story page can say when it happens. They are always saved, changed and deleted together in one
// transaction, with the banner and the "started" flags, so they never drift apart or half save.
export type PostSave = {
    newsId: string | null;  // null for a new post, or for an older calendar entry with no post yet
    eventId: string | null; // the calendar entry the admin list showed with it, if any
    news: NewNews;
    event: NewEvent | null; // null when the post has no day; event.end is its last day, if it runs over several
    // A newly uploaded file; null keeps whatever file the post has now (read fresh, so an
    // out-of-date form never puts back a file someone else has since replaced)
    attachment: { url: string; name: string } | null;
    editor: string;         // who added it (saved on new posts only)
};

// Returns the post's ID (new posts get theirs here), so the admin form can send its alert
export const savePost = async ({ newsId, eventId, news, event, attachment, editor }: PostSave): Promise<string> => {
    if (!isFirebaseConfigured) {
        if (news.isUrgent) mockNewsStore.forEach(post => post.isUrgent = false);
        const existing = newsId ? mockNewsStore.find(p => p.id === newsId) : undefined;
        const file = attachment ? { attachmentUrl: attachment.url, attachmentName: attachment.name } : {};
        const id = existing?.id ?? `mock_news_${Date.now()}`;
        if (existing) Object.assign(existing, news, file, { eventStart: event?.start, eventEnd: event?.end });
        else mockNewsStore.unshift({ ...news, ...file, eventStart: event?.start, eventEnd: event?.end, id, slug: slugify(news.title_en), attachments: [], createdBy: editor } as NewsPostWithId);
        if (event) console.log("Mock calendar entry:", event);
        return id;
    }
    // A transaction cannot search, so the posts that had the banner are found first and re-read inside it
    const bannerPosts = news.isUrgent
        ? (await getDocs(query(collection(firestoreDb, NEWS), where('isUrgent', '==', true)))).docs.map((d) => d.ref)
        : [];
    const contentRef = doc(firestoreDb, ...CONTENT_FLAGS);

    // Everything is re-read here, so if another admin changed this post after the form opened,
    // Firestore runs this again against their version: no second calendar entry, no lost link
    return runTransaction(firestoreDb, async (tx) => {
        const site = await tx.get(contentRef);
        const listedEvent = eventId ? await tx.get(doc(firestoreDb, CALENDAR, eventId)) : null;
        if (!newsId && eventId && !listedEvent?.exists()) throw new Error('This entry has been deleted.');
        // An older calendar entry with no post may have been given one by another admin meanwhile
        const postId = newsId ?? (listedEvent?.data()?.newsId as string | undefined) ?? null;
        const post = postId ? await tx.get(doc(firestoreDb, NEWS, postId)) : null;
        if (newsId && !post?.exists()) throw new Error('This post has been deleted.');
        const saved = post?.exists() ? post.data() : undefined;
        const newsRef = post?.exists() ? post.ref : doc(collection(firestoreDb, NEWS));

        // The calendar entry this post has now
        const linkedEventId = (saved?.eventId as string | undefined)
            ?? (listedEvent?.exists() && (!newsId || listedEvent.data().newsId === newsId) ? listedEvent.id : null);
        const linkedEvent = linkedEventId
            ? (linkedEventId === listedEvent?.id ? listedEvent : await tx.get(doc(firestoreDb, CALENDAR, linkedEventId)))
            : null;
        // The post with the banner right now, which the search above may have missed if another
        // admin set it a moment ago (this is re-read on every retry)
        const bannerId = site.data()?.urgentNewsId;
        const bannerRefs = news.isUrgent && typeof bannerId === 'string' && !bannerPosts.some((ref) => ref.id === bannerId)
            ? [...bannerPosts, doc(firestoreDb, NEWS, bannerId)]
            : bannerPosts;
        const banners = await Promise.all(bannerRefs.map((ref) => tx.get(ref)));

        // Ending with the post's own ID keeps every web address unique, even when two posts share a title.
        // It is set once and never changed, so shared links keep working.
        const slug = (saved?.slug as string | undefined) || `${slugify(news.title_en) || 'news'}-${newsRef.id}`;
        const eventRef = event ? (linkedEventId ? doc(firestoreDb, CALENDAR, linkedEventId) : doc(collection(firestoreDb, CALENDAR))) : null;
        const link = eventRef && event ? { eventId: eventRef.id, eventStart: event.start, ...(event.end ? { eventEnd: event.end } : {}) } : null;
        // Post and calendar entry always carry the same file
        const file = attachment
            ? { attachmentUrl: attachment.url, attachmentName: attachment.name }
            : {
                attachmentUrl: (saved?.attachmentUrl ?? (linkedEvent?.exists() ? linkedEvent.data().attachmentUrl : undefined) ?? '') as string,
                attachmentName: (saved?.attachmentName ?? (linkedEvent?.exists() ? linkedEvent.data().attachmentName : undefined) ?? '') as string,
            };

        if (saved) {
            // The posting date never changes, even if an out-of-date form sends a new one
            const date = typeof saved.date === 'string' ? saved.date : news.date;
            tx.update(newsRef, {
                ...withoutUndefined(news), date, ...file, slug,
                ...(link ? { eventEnd: deleteField(), ...link } : { eventId: deleteField(), eventStart: deleteField(), eventEnd: deleteField() }),
            });
        } else {
            tx.set(newsRef, withoutUndefined({ ...news, ...file, slug, attachments: [], createdBy: editor, ...(link ?? {}) }));
        }
        if (eventRef && event) {
            // Merging keeps fields this form does not show (an older entry's year groups); the last
            // day is on the form, so a removed one is deleted
            tx.set(eventRef, withoutUndefined({ ...event, ...file, newsId: newsRef.id, newsSlug: slug, ...(event.end ? {} : { end: deleteField() }) }), { merge: true });
        } else if (linkedEventId && linkedEvent?.exists()) {
            tx.delete(linkedEvent.ref);
        }
        // Only one post can carry the red homepage banner at a time
        banners.filter((b) => b.exists() && b.id !== newsRef.id && b.data()?.isUrgent === true)
            .forEach((b) => tx.update(b.ref, { isUrgent: false }));
        tx.set(contentRef, {
            newsStarted: true,
            ...(event ? { eventsStarted: true } : {}),
            ...(news.isUrgent ? { urgentNewsId: newsRef.id } : bannerId === newsRef.id ? { urgentNewsId: null } : {}),
        }, { merge: true });
        return newsRef.id;
    });
};

// Deletes a post and its calendar entry together (older items may have only one of the two).
// Links are re-read inside the transaction, so a day another admin added meanwhile goes too.
// Returns the attachments the deleted documents used, for the caller to tidy up.
export const deletePost = async ({ newsId, eventId }: { newsId: string | null; eventId: string | null }): Promise<string[]> => {
    if (!isFirebaseConfigured) {
        mockNewsStore = mockNewsStore.filter(p => p.id !== newsId);
        return [];
    }
    return runTransaction(firestoreDb, async (tx) => {
        const contentRef = doc(firestoreDb, ...CONTENT_FLAGS);
        const site = await tx.get(contentRef);
        const listedEvent = eventId ? await tx.get(doc(firestoreDb, CALENDAR, eventId)) : null;
        // A calendar-only row whose entry has gone may have been turned into a post meanwhile;
        // its post cannot be found from here, so say so rather than report a delete that did not happen
        if (!newsId && eventId && !listedEvent?.exists()) throw new Error('This entry was changed by someone else.');
        const postId = newsId ?? (listedEvent?.data()?.newsId as string | undefined) ?? null;
        const post = postId ? await tx.get(doc(firestoreDb, NEWS, postId)) : null;
        const linkedId = post?.exists() ? (post.data().eventId as string | undefined) : undefined;
        const linkedEvent = linkedId && linkedId !== listedEvent?.id ? await tx.get(doc(firestoreDb, CALENDAR, linkedId)) : null;
        // The listed entry goes when it is the row itself (no post) or belongs to this post
        const ownsListed = listedEvent?.exists() && (!newsId || listedEvent.data().newsId === newsId || listedEvent.id === linkedId);

        const gone = [post, ownsListed ? listedEvent : null, linkedEvent].filter((snap) => snap?.exists());
        if (post?.exists() && site.data()?.urgentNewsId === post.id) {
            tx.set(contentRef, { urgentNewsId: null }, { merge: true });
        }
        gone.forEach((snap) => tx.delete(snap!.ref));
        return [...new Set(gone.map((snap) => snap!.data()?.attachmentUrl).filter((url): url is string => typeof url === 'string' && url !== ''))];
    });
};

// Whether any post or calendar entry still uses a file (checked on the server, so another admin's
// recent change counts). Only signed-in school admins can run this.
export const isAttachmentInUse = async (url: string): Promise<boolean> => {
    if (!isFirebaseConfigured) return false;
    const [inNews, inEvents] = await Promise.all([
        getDocsFromServer(query(collection(firestoreDb, NEWS), where('attachmentUrl', '==', url), limit(1))),
        getDocsFromServer(query(collection(firestoreDb, CALENDAR), where('attachmentUrl', '==', url), limit(1))),
    ]);
    return !inNews.empty || !inEvents.empty;
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


// === LUNCH MENUS ===
// Each council menu the school adds in the admin area is one document in "lunchMenus"
// (see src/lib/lunchMenu.ts for how the site picks this week's menu). Anyone may read them.
const LUNCH_MENUS = 'lunchMenus';

export const getLunchMenus = async (): Promise<LunchMenuWithId[]> => {
    if (!isFirebaseConfigured) return [];
    const snap = await getDocsFromServer(collection(firestoreDb, LUNCH_MENUS));
    // A malformed menu is left out rather than allowed to break the public pages
    return snap.docs.flatMap((d) => {
        const menu = cleanLunchMenu(d.data());
        return menu ? [{ ...menu, id: d.id }] : [];
    });
};

export const saveLunchMenu = async (id: string | null, menu: LunchMenu) => {
    if (!isFirebaseConfigured) {
        console.log('Mock saveLunchMenu:', id, menu.name);
        return;
    }
    const data = { name: menu.name, startsOn: menu.startsOn, endsOn: menu.endsOn, weeks: menu.weeks, updatedAt: new Date().toISOString() };
    if (id) {
        await setDoc(doc(firestoreDb, LUNCH_MENUS, id), data);
    } else {
        await addDoc(collection(firestoreDb, LUNCH_MENUS), data);
    }
};

export const deleteLunchMenu = async (id: string) => {
    if (!isFirebaseConfigured) return;
    await deleteDoc(doc(firestoreDb, LUNCH_MENUS, id));
};

// === LUNCH MENU SETTINGS ===
// The real council menu for this school week (see src/lib/lunchMenu.ts)
export const getWeeklyMenu = async (): Promise<WeeklyMenu | null> => {
    const week = weekMenuFor(new Date(), await getLunchMenus().catch(() => []));
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
