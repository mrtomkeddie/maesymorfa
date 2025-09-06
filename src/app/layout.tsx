
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { PT_Sans } from 'next/font/google';
import { LanguageProvider } from './(public)/LanguageProvider';

const ptSans = PT_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pt-sans',
  weight: ['400', '700']
});


export const metadata: Metadata = {
  title: 'Parent Portal | Maes Y Morfa School',
  description: 'Public website and parent portal for Maes Y Morfa school.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" sizes="any" />
      </head>
      <body className={cn("min-h-screen bg-background font-body antialiased", ptSans.variable)} suppressHydrationWarning={true}>
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
