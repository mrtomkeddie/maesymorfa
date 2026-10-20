
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Inter, VT323 } from 'next/font/google';
import localFont from 'next/font/local';
import { LanguageProvider } from './(public)/LanguageProvider';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Rounded headings, to match the lettering in the school logo.
// Self-hosted: since 14 Oct 2026 Google Fonts sends Vercel's build machines Fredoka links
// (fonts.gstatic.com/l/font?kit=...) that next/font/google cannot read, and the build fails.
// The file is the full Fredoka from github.com/google/fonts, width fixed at normal, weight 300-700.
const fredoka = localFont({
  src: './fonts/fredoka.woff2',
  display: 'swap',
  weight: '300 700',
  variable: '--font-fredoka',
});

const vt323 = VT323({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});


export const metadata: Metadata = {
  title: 'Ysgol Maes Y Morfa',
  description: 'Public website and parent portal for Maes Y Morfa school.',
  appleWebApp: {
    capable: true,
    title: 'Maes Y Morfa',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon.png',
    // iPhones want a solid 180 x 180 icon; the same file at /apple-touch-icon.png is where they look
    // when a page gives none
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  }
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#e11d48',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased", inter.variable, fredoka.variable, vt323.variable)} suppressHydrationWarning={true}>
        <LanguageProvider>
          {children}
          <Toaster />
          <ServiceWorkerRegister />
        </LanguageProvider>
      </body>
    </html>
  );
}
