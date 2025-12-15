
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { Menu, Home, Info, Newspaper, School, Briefcase, Mail, X, LayoutDashboard, Gamepad2, UserCog } from 'lucide-react';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { FEATURES } from '@/lib/config/features';

const content = {
  en: {
    nav: [
      { href: '/', label: 'Home', icon: Home },
      { href: '/about', label: 'About', icon: Info },
      { href: '/news', label: 'News', icon: Newspaper },
      { href: '/admissions', label: 'Admissions', icon: School },
      { href: '/curriculum', label: 'Curriculum', icon: Briefcase },
      { href: '/contact', label: 'Contact', icon: Mail },
    ],
    portal: 'Parent Portal',
    staffLogin: 'Staff Login',
    dashboard: 'Dashboard',
    lang1: 'Cymraeg',
    lang2: 'English',
    menu: 'Menu',
  },
  cy: {
    nav: [
      { href: '/', label: 'Hafan', icon: Home },
      { href: '/about', label: 'Amdanom Ni', icon: Info },
      { href: '/news', label: 'Newyddion', icon: Newspaper },
      { href: '/admissions', label: 'Derbyniadau', icon: School },
      { href: '/curriculum', label: 'Cwricwlwm', icon: Briefcase },
      { href: '/contact', label: 'Cysylltu', icon: Mail },
    ],
    portal: 'Porth Rieni',
    staffLogin: 'Mewngofnodi Staff',
    dashboard: 'Dangosfwrdd',
    lang1: 'Cymraeg',
    lang2: 'English',
    menu: 'Bwydlen',
  }
}

export function PublicHeader() {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const t = content[language];
  const navLinks = t.nav;
  const [isParent, setIsParent] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const authStatus = localStorage.getItem('isAuthenticated') === 'true' && localStorage.getItem('userRole') === 'parent';
    setIsParent(authStatus);
  }, []);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 max-w-7xl items-center justify-between px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold shrink-0">
          <Image src="/logo-header.png" alt="Maes Y Morfa logo" width={1640} height={403} className="h-14 w-auto max-h-14" />
        </Link>

        {/* Center: Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 mx-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-4">
          {/* Language Switcher - Desktop */}
          <div className="hidden sm:flex items-center gap-1 border rounded-full p-1 text-sm bg-background">
            <Button variant={language === 'cy' ? 'default' : 'ghost'} size="sm" className={`rounded-full px-3 py-1 h-auto text-xs ${language === 'cy' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => setLanguage('cy')}>{t.lang1}</Button>
            <div className="w-px h-4 bg-border"></div>
            <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" className={`rounded-full px-3 py-1 h-auto text-xs ${language === 'en' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => setLanguage('en')}>{t.lang2}</Button>
          </div>

          {/* Desktop Action Button */}
          <div className="hidden lg:block">
            {FEATURES.enableParentPortal && (
              isClient && isParent ? (
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                  <Link href="/dashboard">{t.dashboard}</Link>
                </Button>
              ) : (
                <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                  <Link href="/login">{t.portal}</Link>
                </Button>
              )
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[22rem] bg-background p-0 text-foreground" closeIcon={false}>
              <div className="flex h-full flex-col">
                <div className="flex h-20 items-center justify-between border-b border-border/40 px-6">
                  <Link href="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                    <Image src="/logo-header.png" alt="Maes Y Morfa logo" width={1640} height={403} className="h-14 w-auto max-h-14" />
                  </Link>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className='h-9 w-9'>
                      <X className="h-5 w-5 text-muted-foreground" />
                      <span className="sr-only">Close</span>
                    </Button>
                  </SheetClose>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>

                  {/* Mobile Language Switcher */}
                  <div className="flex items-center justify-center gap-1 border rounded-full p-1 text-sm bg-background m-6 mx-4">
                    <Button variant={language === 'cy' ? 'default' : 'ghost'} size="sm" className={`flex-1 rounded-full px-3 py-1 h-auto text-xs ${language === 'cy' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => setLanguage('cy')}>{t.lang1}</Button>
                    <div className="w-px h-4 bg-border"></div>
                    <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" className={`flex-1 rounded-full px-3 py-1 h-auto text-xs ${language === 'en' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => setLanguage('en')}>{t.lang2}</Button>
                  </div>

                  <nav className="flex flex-col p-4 pt-0 space-y-1">
                    {navLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-4 rounded-lg px-4 py-3 text-lg font-medium text-foreground/80 transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span>{link.label}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
                <div className="space-y-3 border-t border-border/40 p-6 bg-muted/20">
                  {FEATURES.enableParentPortal && (
                    isClient && isParent ? (
                      <Button asChild size="lg" className="w-full shadow-sm">
                        <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}> <LayoutDashboard className="mr-2 h-4 w-4" /> {t.dashboard}</Link>
                      </Button>
                    ) : (
                      <Button asChild size="lg" className="w-full shadow-sm">
                        <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>{t.portal}</Link>
                      </Button>
                    )
                  )}
                  {FEATURES.enableTeacherPortal && (
                    <Button asChild size="lg" variant="outline" className="w-full">
                      <Link href="/staff/login" onClick={() => setIsMobileMenuOpen(false)}>{t.staffLogin}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
