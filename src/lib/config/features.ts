export const FEATURES = {
    enableParentPortal: process.env.NEXT_PUBLIC_ENABLE_PARENT_PORTAL === 'true',
    enableTeacherPortal: process.env.NEXT_PUBLIC_ENABLE_TEACHER_PORTAL === 'true',
    enableAdminPortalLinksInUI: process.env.NEXT_PUBLIC_ENABLE_ADMIN_PORTAL_LINKS_IN_UI === 'true',
    enablePhotoGallery: process.env.NEXT_PUBLIC_ENABLE_PHOTO_GALLERY === 'true',
    enableReportAbsence: process.env.NEXT_PUBLIC_ENABLE_REPORT_ABSENCE === 'true',
    enablePortalFooterSections: process.env.NEXT_PUBLIC_ENABLE_PORTAL_FOOTER_SECTIONS === 'true',
    enableMorfaRunner: process.env.NEXT_PUBLIC_ENABLE_MORFA_RUNNER !== 'false', // Default true
    enableSchoolDinnersPage: process.env.NEXT_PUBLIC_ENABLE_SCHOOL_DINNERS_PAGE === 'true',
} as const;

// The admin area shows only pages that really save to the website. The rest (staff, documents,
// lunch menu, settings, inbox, parents, children, users, gallery, dashboard) are still demos with
// sample data, so they are hidden and their addresses lead back to ADMIN_HOME.
export const ADMIN_HOME = '/admin/announcements';
export const LIVE_ADMIN_PAGES = [ADMIN_HOME];
