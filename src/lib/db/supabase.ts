
// This file will contain the Supabase implementations of all data functions.
// Note: This is a placeholder implementation. A real implementation would require a
// Supabase project with tables matching the data structures in src/lib/types.ts.

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { NewsPost, NewsPostWithId, CalendarEvent, CalendarEventWithId, StaffMember, StaffMemberWithId, Document, DocumentWithId, Parent, ParentWithId, Child, ChildWithId, SiteSettings, InboxMessage, InboxMessageWithId, Photo, PhotoWithId, WeeklyMenu, UserWithRole, UserRole, ParentNotification, ParentNotificationWithId } from '@/lib/types';
import { news as mockNews } from '@/lib/mockNews';
import { yearGroups } from '@/components/admin/ChildForm';

// Only create a client if the environment variables are set.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseAnonKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
        console.error("Error initializing Supabase client:", error);
    }
}

// Helper function to ensure Supabase is configured before use.
function getSupabaseClient(): SupabaseClient {
    if (!supabase) {
        // This check is important for when the app runs in an environment
        // where Supabase credentials are not provided (like Firebase Studio).
        throw new Error("Supabase is not configured. Please provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
    }
    return supabase;
}


// === NEWS ===
const fromSupabaseNews = (news: any): NewsPostWithId => {
    if (!news) return news;
    return {
        ...news,
        attachmentUrl: news.attachmentUrl,
        attachmentName: news.attachmentName,
        isUrgent: news.isUrgent,
        createdBy: news.createdBy,
        lastEdited: news.lastEdited,
        date: news.date,
    };
};

const toSupabaseNews = (news: Partial<NewsPost>) => {
    // Supabase client handles JSON conversion, so we can pass objects directly.
    // The key is to map our camelCase fields to snake_case columns if needed.
    // For this schema, we used quoted camelCase, so no mapping is needed.
    return news;
};


export const getNews = async (): Promise<NewsPostWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('date', { ascending: false });

    if (error) {
        console.error("Error fetching news from Supabase:", error);
        throw error;
    }
    return (data || []).map(fromSupabaseNews);
};

export const addNews = async (newsData: Omit<NewsPost, 'id' | 'attachments' | 'slug'>): Promise<string> => {
    const supabase = getSupabaseClient();
    const slug = newsData.title_en.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const finalNewsData = toSupabaseNews({ ...newsData, slug });

     if (finalNewsData.isUrgent) {
        await supabase.from('news').update({ isUrgent: false }).eq('isUrgent', true);
    }

    const { data, error } = await supabase
        .from('news')
        .insert([finalNewsData])
        .select('id')
        .single();

    if (error) {
        console.error("Error adding news to Supabase:", error);
        throw error;
    }
    return data.id;
};

export const updateNews = async (id: string, newsData: Partial<Omit<NewsPost, 'id' | 'attachments'>>) => {
    const supabase = getSupabaseClient();
     if (newsData.isUrgent) {
        await supabase.from('news').update({ isUrgent: false }).neq('id', id);
    }
    const { error } = await supabase
        .from('news')
        .update(toSupabaseNews(newsData))
        .eq('id', id);
    
    if (error) {
        console.error("Error updating news in Supabase:", error);
        throw error;
    }
};

export const deleteNews = async (id: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting news from Supabase:", error);
        throw error;
    }
};

export const getPaginatedNews = async (limitNum = 20, lastDoc?: any): Promise<{ data: NewsPostWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('date', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching paginated news from Supabase:", error);
        throw error;
    }

    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;

    return { data: (data || []).map(fromSupabaseNews), lastDoc: nextLastDoc };
};


// === CALENDAR ===
const fromSupabaseCalendarEvent = (event: any): CalendarEventWithId => {
    if (!event) return event;
    return {
        id: event.id,
        title_en: event.title_en,
        title_cy: event.title_cy,
        description_en: event.description_en,
        description_cy: event.description_cy,
        start: event.start_time,
        end: event.end_time,
        allDay: event.all_day,
        tags: event.tags || [],
        relevantTo: event.relevant_to || [],
        attachmentUrl: event.attachment_url,
        attachmentName: event.attachment_name,
        attachments: [], // Deprecated field
        isUrgent: event.is_urgent,
        showOnHomepage: event.show_on_homepage,
        published: event.published,
        linkedNewsPostId: event.linked_news_post_id,
    };
};

const toSupabaseCalendarEvent = (event: Partial<Omit<CalendarEvent, 'id' | 'attachments'>>) => {
    const {
        start, end, allDay, relevantTo, attachmentUrl, attachmentName, isUrgent, showOnHomepage, linkedNewsPostId,
        ...rest
    } = event;

    return {
        ...rest,
        start_time: start,
        end_time: end,
        all_day: allDay,
        relevant_to: relevantTo,
        attachment_url: attachmentUrl,
        attachment_name: attachmentName,
        is_urgent: isUrgent,
        show_on_homepage: showOnHomepage,
        linked_news_post_id: linkedNewsPostId,
    };
};

const generateNewsDataFromEvent = (eventData: Partial<Omit<CalendarEvent, 'id' | 'attachments'>>): Omit<NewsPost, 'id' | 'slug' | 'attachments'> => {
    return {
        title_en: `${eventData.title_en} (Event)`,
        title_cy: `${eventData.title_cy} (Digwyddiad)`,
        body_en: eventData.description_en || '',
        body_cy: eventData.description_cy || '',
        date: eventData.start!,
        category: 'Event',
        isUrgent: eventData.isUrgent || false,
        attachmentUrl: eventData.attachmentUrl,
        attachmentName: eventData.attachmentName,
        published: true,
        createdBy: 'admin@example.com',
        lastEdited: new Date().toISOString(),
    };
};

export const getCalendarEvents = async (): Promise<CalendarEventWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('calendar_events').select('*').order('start_time', { ascending: true });
    if (error) throw error;
    return data.map(fromSupabaseCalendarEvent);
};

export const addCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'attachments'>, crossPost: boolean) => {
    const supabase = getSupabaseClient();
    let finalEventData: Partial<CalendarEvent> = { ...eventData };

    if (crossPost) {
        const newsData = generateNewsDataFromEvent(eventData);
        const newsId = await addNews(newsData);
        finalEventData.linkedNewsPostId = newsId;
    }
    
    const { error } = await supabase.from('calendar_events').insert([toSupabaseCalendarEvent(finalEventData)]);
    if (error) throw error;
};

export const updateCalendarEvent = async (id: string, eventData: Partial<Omit<CalendarEvent, 'id' | 'attachments'>>, crossPost: boolean) => {
    const supabase = getSupabaseClient();
    let finalEventData = { ...eventData };
    
    if (crossPost) {
        const newsData = generateNewsDataFromEvent(eventData as Omit<CalendarEvent, 'id' | 'attachments'>);
        if (finalEventData.linkedNewsPostId) {
            await updateNews(finalEventData.linkedNewsPostId, newsData);
        } else {
            const newsId = await addNews(newsData);
            finalEventData.linkedNewsPostId = newsId;
        }
    }
    
    const { error } = await supabase.from('calendar_events').update(toSupabaseCalendarEvent(finalEventData)).eq('id', id);
    if (error) throw error;
};

export const deleteCalendarEvent = async (id: string) => {
    const supabase = getSupabaseClient();
    // TODO: Add logic to optionally delete linked news post
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
};

export const getPaginatedCalendarEvents = async (limitNum = 20, lastDoc?: any): Promise<{ data: CalendarEventWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase.from('calendar_events').select('*').order('start_time', { ascending: true }).range(from, to);
    if (error) throw error;
    
    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;
    return { data: data.map(fromSupabaseCalendarEvent), lastDoc: nextLastDoc };
};

// === STAFF ===
const fromSupabaseStaff = (staff: any): StaffMemberWithId => {
    if (!staff) return staff;
    return {
        ...staff,
        userId: staff.user_id,
        photoUrl: staff.photo_url,
    };
};

const toSupabaseStaff = (staff: Partial<StaffMember>) => {
    const { photoUrl, userId, ...rest } = staff;
    return {
        ...rest,
        user_id: userId,
        photo_url: photoUrl,
    };
};

export const getStaff = async (userId?: string): Promise<StaffMemberWithId[]> => {
    const supabase = getSupabaseClient();
    let query = supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true });
    
    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching staff from Supabase:", error);
        throw error;
    }
    return (data || []).map(fromSupabaseStaff);
};

export const addStaffMember = async (staffData: StaffMember): Promise<string> => {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
        .from('staff')
        .insert([toSupabaseStaff(staffData)])
        .select('id')
        .single();

    if (error) {
        console.error("Error adding staff member to Supabase:", error);
        throw error;
    }
    return data.id;
};

export const updateStaffMember = async (id: string, staffData: Partial<StaffMember>) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('staff')
        .update(toSupabaseStaff(staffData))
        .eq('id', id);

    if (error) {
        console.error("Error updating staff member in Supabase:", error);
        throw error;
    }
};

export const deleteStaffMember = async (id: string) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting staff member from Supabase:", error);
        throw error;
    }
};

export const getPaginatedStaff = async (limitNum = 20, lastDoc?: any): Promise<{ data: StaffMemberWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();

    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase
        .from('staff')
        .select('*')
        .order('name', { ascending: true })
        .range(from, to);

    if (error) {
        console.error("Error fetching paginated staff from Supabase:", error);
        throw error;
    }

    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;

    return { data: (data || []).map(fromSupabaseStaff), lastDoc: nextLastDoc };
};

export const getTeacherAndClass = async (userId: string): Promise<{ teacher: StaffMemberWithId, myClass: ChildWithId[] } | null> => {
    const teacherProfile = await getStaff(userId);
    if (!teacherProfile || teacherProfile.length === 0) {
        console.warn(`No staff profile found for user ID: ${userId}`);
        return null;
    }
    const teacher = teacherProfile[0];
    const myClass = await getChildrenByYearGroup(teacher.team);
    return { teacher, myClass };
}

// === DOCUMENTS ===
const fromSupabaseDocument = (doc: any): DocumentWithId => {
    if (!doc) return doc;
    return {
        ...doc,
        fileUrl: doc.file_url,
        uploadedAt: doc.uploaded_at,
    };
};

const toSupabaseDocument = (doc: Partial<Document>) => {
    const { fileUrl, uploadedAt, ...rest } = doc;
    return {
        ...rest,
        file_url: fileUrl,
        uploaded_at: uploadedAt,
    };
};

export const getDocuments = async (): Promise<DocumentWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false });

    if (error) {
        console.error("Error fetching documents from Supabase:", error);
        throw error;
    }
    return (data || []).map(fromSupabaseDocument);
};

export const addDocument = async (docData: Document) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('documents')
        .insert([toSupabaseDocument(docData)]);

    if (error) {
        console.error("Error adding document to Supabase:", error);
        throw error;
    }
};

export const updateDocument = async (id: string, docData: Partial<Document>) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('documents')
        .update(toSupabaseDocument(docData))
        .eq('id', id);

    if (error) {
        console.error("Error updating document in Supabase:", error);
        throw error;
    }
};

export const deleteDocument = async (id: string) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting document from Supabase:", error);
        throw error;
    }
};

export const getPaginatedDocuments = async (limitNum = 20, lastDoc?: any): Promise<{ data: DocumentWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();

    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching paginated documents from Supabase:", error);
        throw error;
    }

    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;

    return { data: (data || []).map(fromSupabaseDocument), lastDoc: nextLastDoc };
};

// === PARENTS ===
const fromSupabaseParent = (parent: any): ParentWithId => {
    if (!parent) return parent;
    return {
        ...parent,
        createdAt: parent.created_at,
    };
};

const toSupabaseParent = (parent: Partial<Parent>) => {
    const { ...rest } = parent;
    return rest;
};

export const getParents = async (): Promise<ParentWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('parents').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data.map(fromSupabaseParent);
};

export const getParentById = async (id: string): Promise<ParentWithId | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('parents').select('*').eq('id', id).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data ? fromSupabaseParent(data) : null;
};

export const addParent = async (parentData: Parent): Promise<string> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('parents').insert([toSupabaseParent(parentData)]).select('id').single();
    if (error) throw error;
    return data.id;
};

export const updateParent = async (id: string, parentData: Partial<Parent>) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('parents').update(toSupabaseParent(parentData)).eq('id', id);
    if (error) throw error;
};

export const deleteParent = async (id: string) => {
    const supabase = getSupabaseClient();
    
    // First, find all children linked to this parent
    const { data: linkedChildren, error: fetchError } = await supabase
        .from('children')
        .select('id, linked_parents')
        .contains('linked_parents', `[{"parentId":"${id}"}]`);

    if (fetchError) throw fetchError;

    // For each child, remove the parent from their linked_parents array
    if (linkedChildren) {
        for (const child of linkedChildren) {
            const updatedLinks = (child.linked_parents as any[]).filter(lp => lp.parentId !== id);
            const { error: updateError } = await supabase
                .from('children')
                .update({ linked_parents: updatedLinks })
                .eq('id', child.id);
            if (updateError) throw updateError;
        }
    }

    // Now, delete the parent
    const { error: deleteError } = await supabase.from('parents').delete().eq('id', id);
    if (deleteError) throw deleteError;
};

export const getPaginatedParents = async (limitNum = 20, lastDoc?: any): Promise<{ data: ParentWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase.from('parents').select('*').order('name', { ascending: true }).range(from, to);
    if (error) throw error;
    
    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;
    return { data: data.map(fromSupabaseParent), lastDoc: nextLastDoc };
};


// === CHILDREN ===
const fromSupabaseChild = (child: any): ChildWithId => {
    if (!child) return child;
    return {
        id: child.id,
        name: child.name,
        yearGroup: child.year_group,
        dob: child.dob,
        linkedParents: child.linked_parents,
        allergies: child.allergies,
        onePageProfileUrl: child.one_page_profile_url,
    };
};

const toSupabaseChild = (child: Partial<Child>) => {
    return {
        name: child.name,
        year_group: child.yearGroup,
        dob: child.dob,
        linked_parents: child.linkedParents,
        allergies: child.allergies,
        one_page_profile_url: child.onePageProfileUrl,
    };
};

export const getChildren = async (): Promise<ChildWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('children').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data.map(fromSupabaseChild);
};

export const getChildrenByYearGroup = async (yearGroup: string): Promise<ChildWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('children')
        .select('*')
        .eq('year_group', yearGroup)
        .order('name', { ascending: true });
    if (error) throw error;
    return data.map(fromSupabaseChild);
};

export const addChild = async (childData: Child) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('children').insert([toSupabaseChild(childData)]);
    if (error) throw error;
};

export const bulkAddChildren = async (childrenData: Child[]) => {
    const supabase = getSupabaseClient();
    const supabaseData = childrenData.map(toSupabaseChild);
    const { error } = await supabase.from('children').insert(supabaseData);
    if (error) throw error;
}

export const updateChild = async (id: string, childData: Partial<Child>) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('children').update(toSupabaseChild(childData)).eq('id', id);
    if (error) throw error;
};

export const deleteChild = async (id: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('children').delete().eq('id', id);
    if (error) throw error;
};

export const promoteAllChildren = async (): Promise<void> => {
    const supabase = getSupabaseClient();
    
    // Promote children
    const { data: children, error: childError } = await supabase.from('children').select('*');
    if (childError) throw childError;

    const leaversYear = new Date().getFullYear() + 1;
    const archiveLabel = `Archived/Leavers ${leaversYear}`;

    for (const child of children) {
        const currentYearIndex = yearGroups.indexOf(child.year_group);
        let nextYearGroup: string;

        if (child.year_group === yearGroups[yearGroups.length - 1]) {
            nextYearGroup = archiveLabel;
        } else if (currentYearIndex > -1) {
            nextYearGroup = yearGroups[currentYearIndex + 1];
        } else {
            continue; // Skip if not in a standard year group
        }

        const { error: updateError } = await supabase
            .from('children')
            .update({ year_group: nextYearGroup })
            .eq('id', child.id);
        
        if (updateError) console.error(`Failed to promote child ${child.id}:`, updateError);
    }
};


export const bulkUpdateChildren = async (ids: string[], data: Partial<Child>) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('children').update(toSupabaseChild(data)).in('id', ids);
    if (error) throw error;
};

export const getPaginatedChildren = async (limitNum = 20, lastDoc?: any): Promise<{ data: ChildWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase.from('children').select('*').order('name', { ascending: true }).range(from, to);
    if (error) throw error;
    
    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;
    return { data: data.map(fromSupabaseChild), lastDoc: nextLastDoc };
};




// === SITE SETTINGS ===
export const getSiteSettings = async (): Promise<SiteSettings | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site')
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = 'exact one row not found'
        console.error("Error fetching site settings from Supabase:", error);
        throw error;
    }
    return data ? data.value as SiteSettings : null;
};

export const updateSiteSettings = async (settings: SiteSettings) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('settings')
        .upsert({ key: 'site', value: settings });

    if (error) {
        console.error("Error updating site settings in Supabase:", error);
        throw error;
    }
};

// === LUNCH MENU SETTINGS ===
export const getWeeklyMenu = async (): Promise<WeeklyMenu | null> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'weeklyMenu')
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching weekly menu from Supabase:", error);
        throw error;
    }
    return data ? data.value as WeeklyMenu : null;
};

export const updateWeeklyMenu = async (menu: WeeklyMenu) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('settings')
        .upsert({ key: 'weeklyMenu', value: menu });

    if (error) {
        console.error("Error updating weekly menu in Supabase:", error);
        throw error;
    }
};

// === INBOX ===
const fromSupabaseInboxMessage = (message: any): InboxMessageWithId => {
    return {
        id: message.id,
        createdAt: message.created_at,
        isReadByAdmin: message.isReadByAdmin,
        isReadByParent: message.isReadByParent,
        threadId: message.threadId,
        ...message,
    };
};

const toSupabaseInboxMessage = (message: Partial<InboxMessage>) => {
    const { isReadByAdmin, isReadByParent, threadId, ...rest } = message;
    return {
        ...rest,
        isReadByAdmin: isReadByAdmin,
        isReadByParent: isReadByParent,
        threadId: threadId,
    };
};

export const addInboxMessage = async (messageData: InboxMessage): Promise<string> => {
    const supabase = getSupabaseClient();
    // If threadId is not provided, this is the first message in a thread.
    // We'll set the threadId to be the same as the message's own ID after insertion.
    let { threadId, ...restOfMessageData } = messageData;
    
    const { data, error } = await supabase
      .from('inbox')
      .insert([toSupabaseInboxMessage(restOfMessageData)])
      .select('id')
      .single();

    if (error) throw error;

    const messageId = data.id;

    if (!threadId) {
        // This is a new thread, so update the message to set its threadId to its own id.
        const { error: updateError } = await supabase
            .from('inbox')
            .update({ threadId: messageId })
            .eq('id', messageId);
        
        if (updateError) {
            console.error("Error setting threadId for new message:", updateError);
            // Even if this fails, we still return the messageId
        }
    }
    
    return messageId;
};

export const getInboxMessages = async (): Promise<InboxMessageWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('inbox').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(fromSupabaseInboxMessage);
};

export const getInboxMessagesForUser = async (userId: string): Promise<InboxMessageWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('inbox')
        .select('*')
        .or(`sender->>id.eq.${userId},recipient->>id.eq.${userId}`);
    
    if (error) throw error;
    return data.map(fromSupabaseInboxMessage);
};

export const updateInboxMessage = async (id: string, data: Partial<InboxMessage>) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('inbox').update(toSupabaseInboxMessage(data)).eq('id', id);
    if (error) throw error;
};

export const deleteInboxMessage = async (id: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('inbox').delete().eq('id', id);
    if (error) throw error;
};

export const getUnreadMessageCount = async (userId: string, userType: 'admin' | 'parent'): Promise<number> => {
    const supabase = getSupabaseClient();
    
    const query = supabase
        .from('inbox')
        .select('*', { count: 'exact', head: true });

    if (userType === 'admin') {
        query.eq('isReadByAdmin', false);
    } else {
        query.eq('recipient->>id', userId).eq('isReadByParent', false);
    }
    
    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
};

// === NOTIFICATIONS ===
export const addParentNotification = async (notificationData: ParentNotification): Promise<string> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('notifications').insert([notificationData]).select('id').single();
    if (error) throw error;
    return data.id;
};

export const getParentNotifications = async (): Promise<ParentNotificationWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('date', { ascending: false });
    if (error) throw error;
    return data;
}

export const getNotificationsForParent = async (parentId: string): Promise<ParentNotificationWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('parentId', parentId)
        .order('date', { ascending: false });
    if (error) throw error;
    return data;
}

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('notifications').update({ isRead: true }).eq('id', notificationId);
    if (error) throw error;
}

export const getValuesAwardCount = async (childId: string): Promise<number> => {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('childId', childId)
      .eq('type', 'Values Award');

    if (error) throw error;
    return count || 0;
};

export const getAwardsForChild = async (childId: string): Promise<ParentNotificationWithId[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('childId', childId)
        .eq('type', 'Values Award')
        .order('date', { ascending: false });
        
    if (error) throw error;
    return data;
};


// === GALLERY ===
const fromSupabasePhoto = (photo: any): PhotoWithId => {
    if (!photo) return photo;
    return {
        id: photo.id,
        caption: photo.caption,
        imageUrl: photo.image_url,
        yearGroups: photo.year_groups || [],
        uploadedAt: photo.uploaded_at,
        uploadedBy: photo.uploaded_by,
    };
};

const toSupabasePhoto = (photo: Partial<Photo>) => {
    return {
        caption: photo.caption,
        image_url: photo.imageUrl,
        year_groups: photo.yearGroups,
        uploaded_at: photo.uploadedAt,
        uploaded_by: photo.uploadedBy,
    };
};

export const addPhoto = async (photoData: Photo): Promise<string> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('photos').insert([toSupabasePhoto(photoData)]).select('id').single();
    if (error) throw error;
    return data.id;
};

export const deletePhoto = async (id: string) => {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('photos').delete().eq('id', id);
    if (error) throw error;
};

export const getPaginatedPhotos = async (limitNum = 20, lastDoc?: any): Promise<{ data: PhotoWithId[], lastDoc?: any }> => {
    const supabase = getSupabaseClient();
    const page = lastDoc ? lastDoc.page + 1 : 0;
    const from = page * limitNum;
    const to = from + limitNum - 1;

    const { data, error } = await supabase.from('photos').select('*').order('uploaded_at', { ascending: false }).range(from, to);
    if (error) throw error;
    
    const nextLastDoc = data && data.length === limitNum ? { page } : undefined;
    return { data: data.map(fromSupabasePhoto), lastDoc: nextLastDoc };
};

export const getPhotosForYearGroups = async (yearGroups: string[]): Promise<PhotoWithId[]> => {
    const supabase = getSupabaseClient();
    const allGroups = ['All', ...yearGroups];
    const { data, error } = await supabase
        .from('photos')
        .select('*')
        .overlaps('year_groups', allGroups)
        .order('uploaded_at', { ascending: false });

    if (error) {
        console.error("Error fetching photos by year group from Supabase:", error);
        throw error;
    }
    return (data || []).map(fromSupabasePhoto);
};


// === USER MANAGEMENT ===
export const getUsersWithRoles = async (): Promise<UserWithRole[]> => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('get_users_with_roles');
    if (error) {
        console.error("Error fetching users with roles:", error);
        throw error;
    }
    return data || [];
};

export const updateUserRole = async (userId: string, role: UserRole) => {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: role }, { onConflict: 'user_id' });

    if (error) {
        console.error("Error updating user role:", error);
        throw error;
    }
};

export const createUser = async (email: string, role: UserRole) => {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { role: role }
    });
    if (error) {
        console.error("Error creating user:", error);
        throw error;
    }
    // Note: The user_roles table should be updated via a trigger in Supabase
    // when a new user is created via invitation.
    return data;
}


// === UTILITIES ===
export const getCollectionCount = async (collectionName: string): Promise<number> => {
    const supabase = getSupabaseClient();
    const { count, error } = await supabase
        .from(collectionName)
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error(`Error getting count for ${collectionName}:`, error);
        // This is a bit of a hack for development when tables don't exist yet
        if (process.env.NODE_ENV !== 'production' && error.code === '42P01') {
            return 0;
        }
        throw error;
    }
    return count || 0;
};
