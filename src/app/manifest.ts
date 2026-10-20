import type { MetadataRoute } from 'next';

// Served at /manifest.webmanifest. Lets parents add the site to their home screen as an app.
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Ysgol Maes Y Morfa',
        short_name: 'Maes Y Morfa',
        description: 'News, dates, lunch menus and the parent portal for Maes Y Morfa Primary Community School.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#e11d48',
        // Recent iPhones take the Home Screen icon from this list, not from the apple-touch-icon tag,
        // and draw a letter on the theme colour when they cannot use it. So the solid 180 x 180 iPhone
        // icon comes first. ?v= makes phones fetch an icon again after it changes (they keep old copies).
        icons: [
            { src: '/apple-touch-icon.png?v=2', sizes: '180x180', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
