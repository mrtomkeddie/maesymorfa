
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, serverTimestamp, setDoc, writeBatch, where, getDoc, limit, startAfter, count, getCountFromServer } from "firebase/firestore"; 
// This file is intended for a Firebase implementation, but for Studio's mock environment,
// we will return mock data instead of making live calls.
import { db as firestoreDb } from "../firebase/config";
import type { NewsPost } from "@/lib/mockNews";
import type { CalendarEvent } from "@/lib/mockCalendar";
import type { StaffMember, StaffMemberWithId, Document, DocumentWithId, Parent, ParentWithId, Child, ChildWithId, SiteSettings, LinkedParent, InboxMessage, InboxMessageWithId, Photo, PhotoWithId, DailyMenu, WeeklyMenu, UserWithRole, UserRole, ParentNotification, ParentNotificationWithId } from "@/lib/types";
import { yearGroups } from "@/components/admin/ChildForm";
import { QueryDocumentSnapshot } from "firebase/firestore";
import { news as mockNewsData } from '@/lib/mockNews';
import { calendarEvents as mockCalendarEvents } from '@/lib/mockCalendar';
import { generateMockData, parentChildren } from '@/lib/mockData';

// === NEWS ===
export type NewsPostWithId = NewsPost & { id: string };

const generateMockNews = () => mockNewsData.map((post, index) => ({
    ...post,
    id: `mock_news_${index}`,
}));

let mockNewsStore = generateMockNews();

export const getNews = async (): Promise<NewsPostWithId[]> => {
    return Promise.resolve(mockNewsStore);
};

export const addNews = async (newsData: Omit<NewsPost, 'id' | 'attachments' | 'slug'>): Promise<string> => {
    console.log("Mock addNews:", newsData);
     if (newsData.isUrgent) {
        mockNewsStore.forEach(post => post.isUrgent = false);
    }
    const newPost = { 
        ...newsData,
        id: `mock_news_${Date.now()}`,
        slug: newsData.title_en.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, ''),
        attachments: [],
    } as NewsPostWithId
    mockNewsStore.unshift(newPost);
    return Promise.resolve(newPost.id);
};

export const updateNews = async (id: string, newsData: Partial<Omit<NewsPost, 'id' | 'attachments'>>) => {
    console.log(`Mock updateNews (id: ${id}):`, newsData);
    if (newsData.isUrgent) {
        mockNewsStore.forEach(post => {
            if (post.id !== id) post.isUrgent = false;
        });
    }
    const index = mockNewsStore.findIndex(p => p.id === id);
    if (index !== -1) {
        mockNewsStore[index] = { ...mockNewsStore[index], ...newsData };
    }
    return Promise.resolve();
};

export const deleteNews = async (id: string) => {
    console.log(`Mock deleteNews (id: ${id})`);
    mockNewsStore = mockNewsStore.filter(p => p.id !== id);
    return Promise.resolve();
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
export type CalendarEventWithId = CalendarEvent & { id: string };

const generateMockCalendarEvents = () => mockCalendarEvents.map((event, index) => ({
    ...event,
    id: `mock_cal_${index}`,
}));

export const getCalendarEvents = async (): Promise<CalendarEventWithId[]> => {
    return Promise.resolve(generateMockCalendarEvents());
};

export const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'attachments'>, crossPost: boolean) => {
    console.log("Mock addCalendarEvent:", eventData, `Cross-post: ${crossPost}`);
    return Promise.resolve();
};

export const updateCalendarEvent = async (id: string, eventData: Partial<Omit<CalendarEvent, 'id' | 'attachments'>>, crossPost: boolean) => {
    console.log(`Mock updateCalendarEvent (id: ${id}):`, eventData, `Cross-post: ${crossPost}`);
    return Promise.resolve();
};

export const deleteCalendarEvent = async (id: string) => {
    console.log(`Mock deleteCalendarEvent (id: ${id})`);
    return Promise.resolve();
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
    { id: '3', name: 'David Williams', role: 'Teacher', team: 'Year 6', email: 'david.williams@example.com', userId: 'mock-teacher-id-1'},
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
const mockWeeklyMenu: WeeklyMenu = {
    monday: { main: "Shepherd's Pie", alt: "Jacket Potato with Beans", dessert: "Apple Crumble" },
    tuesday: { main: "Chicken Curry", alt: "Vegetable Lasagne", dessert: "Fruit Salad" },
    wednesday: { main: "Roast Beef Dinner", alt: "Quorn Roast Dinner", dessert: "Chocolate Sponge" },
    thursday: { main: "Spaghetti Bolognese", alt: "Vegetable Stir Fry", dessert: "Yoghurt" },
    friday: { main: "Fish and Chips", alt: "Veggie Sausages", dessert: "Flapjack" },
};
export const getWeeklyMenu = async (): Promise<WeeklyMenu | null> => Promise.resolve(mockWeeklyMenu);
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
    const newNotif = { ...notificationData, id: `mock_notif_${Date.now()}`};
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
    if(index > -1) {
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

export const createUser = async(email: string, role: UserRole) => {
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
