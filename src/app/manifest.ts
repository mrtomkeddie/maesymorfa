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
        icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
    };
}
