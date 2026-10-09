
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Fredoka, Inter, VT323 } from 'next/font/google';
import { LanguageProvider } from './(public)/LanguageProvider';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// Rounded headings, to match the lettering in the school logo.
const fredoka = Fredoka({
  subsets: ['latin'],
  display: 'swap',
  weight: ['500', '600', '700'],
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
    apple: '/mobile-icon.png',
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
