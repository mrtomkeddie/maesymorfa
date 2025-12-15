import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Read config from environment (edge-safe)
    const enableParentPortal = process.env.NEXT_PUBLIC_ENABLE_PARENT_PORTAL === 'true'
    const enableTeacherPortal = process.env.NEXT_PUBLIC_ENABLE_TEACHER_PORTAL === 'true'

    // Parent Portal Guards
    if (
        !enableParentPortal &&
        (pathname.startsWith('/dashboard') ||
            pathname.startsWith('/inbox') ||
            pathname.startsWith('/calendar') ||
            pathname.startsWith('/gallery') ||
            pathname.startsWith('/absence') ||
            pathname.startsWith('/account'))
    ) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Teacher Portal Guards
    if (!enableTeacherPortal && pathname.startsWith('/teacher')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/inbox/:path*',
        '/calendar/:path*',
        '/gallery/:path*',
        '/absence/:path*',
        '/account/:path*',
        '/teacher/:path*'
    ],
}
