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
