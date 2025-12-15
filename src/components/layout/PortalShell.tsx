'use client';

import {
    SidebarProvider,
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarInset,
    SidebarFooter,
    SidebarTrigger,
    SidebarMenuBadge,
    SidebarSeparator,
} from '@/components/ui/sidebar';
import {
    LogOut,
    Loader2,
    Home,
    User,
    PanelLeft // Use PanelLeft as a generic icon if needed, or keeping existing logic
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { LanguageToggle } from '@/app/(portal)/layout'; // Re-exporting or moving this might be cleaner later, but importing for now is fine if it's exported.
// actually, let's redefine LanguageToggle locally or import it if compatible. 
// To avoid circular dependency issues if (portal)/layout imports this, we should redefine it OR extract it.
// Extracting it is cleaner, but for now I will redefine a simple version here or expect a prop/slot.
// Re-implementing LanguageToggle here to be safe and self-contained.

export const PortalLanguageToggle = () => {
    const { language, setLanguage } = useLanguage();
    const [isPending, startTransition] = useTransition();

    const content = {
        en: { lang1: 'Cymraeg', lang2: 'English' },
        cy: { lang1: 'Cymraeg', lang2: 'English' }
    };
    const t = content[language];

    const handleLanguageChange = (newLang: 'en' | 'cy') => {
        startTransition(() => {
            setLanguage(newLang);
        });
    };

    return (
        <div className="flex items-center gap-1 border rounded-full p-1 text-sm bg-background">
            <Button variant={language === 'cy' ? 'default' : 'ghost'} size="sm" className={`rounded-full px-3 py-1 h-auto text-xs portal-lang-toggle ${language === 'cy' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => handleLanguageChange('cy')} disabled={isPending}>{t.lang1}</Button>
            <div className="w-px h-4 bg-border"></div>
            <Button variant={language === 'en' ? 'default' : 'ghost'} size="sm" className={`rounded-full px-3 py-1 h-auto text-xs portal-lang-toggle ${language === 'en' ? 'bg-accent hover:bg-accent/80 text-accent-foreground' : ''}`} onClick={() => handleLanguageChange('en')} disabled={isPending}>{t.lang2}</Button>
        </div>
    )
}

interface MenuItem {
    href: string;
    label: string;
    icon: any; // Lucide icon
    badge?: number;
}

interface PortalShellProps {
    children: React.ReactNode;
    menuItems: MenuItem[];
    title: string;
    roleLabel: string;
    userEmail?: string;
    onLogout: () => void;
    isLoading?: boolean;
    // Optional slot for FAB or extra mobile elements
    mobileExtras?: React.ReactNode;
}

const BottomNav = ({ menuItems }: { menuItems: MenuItem[] }) => {
    const pathname = usePathname();
    const router = useRouter();

    // Filter items suitable for mobile bottom nav if needed, or use all (max 4-5 usually)
    // We'll use the first 4-5 items
    const displayItems = menuItems.slice(0, 5);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 h-24 border-t bg-background/95 backdrop-blur-sm lg:hidden transition-transform duration-200"
            style={{ transform: 'translateY(calc(var(--keyboard-height, 0px) * -1))' }}
        >
            <div className="mx-auto flex h-full max-w-md items-center justify-around px-safe pb-[env(safe-area-inset-bottom)]">
                {displayItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            href={item.href}
                            key={item.href}
                            onClick={(e) => {
                                // e.preventDefault(); // Default behavior is usually fine for Link unless specific transition logic
                                // router.push(item.href);
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs transition-colors w-16 h-full pt-2 pb-6",
                                isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-primary"
                            )}
                        >
                            <Icon className={cn("h-6 w-6", isActive && "fill-current/10")} />
                            <span className="truncate max-w-[64px]">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export function PortalShell({
    children,
    menuItems,
    title,
    roleLabel,
    userEmail,
    onLogout,
    isLoading = false,
    mobileExtras
}: PortalShellProps) {
    const pathname = usePathname();
    const isMobile = useIsMobile();
    useKeyboardHeight();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <SidebarProvider>
            <Sidebar variant="inset" collapsible="icon">
                <SidebarHeader className="border-b p-4 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
                    <Link href={menuItems[0]?.href || '#'} className="flex items-center gap-2">
                        <Image src="/icon.png" alt="School logo" width={28} height={28} className="w-7 h-7" />
                        <span className="text-lg font-extrabold tracking-tighter text-foreground group-data-[collapsible=icon]:hidden">
                            {title}
                        </span>
                    </Link>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarMenu className="p-2">
                        {menuItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={pathname.startsWith(item.href)}
                                    tooltip={{ children: item.label }}
                                >
                                    <Link href={item.href}>
                                        <item.icon />
                                        <span>{item.label}</span>
                                        {item.badge && item.badge > 0 ? (
                                            <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                                        ) : null}
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarContent>
                <SidebarFooter className="p-3">
                    <div className="bg-sidebar-accent/50 rounded-xl p-3 border border-sidebar-border/50">
                        <div className="flex w-full items-center gap-3 mb-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:mb-0">
                            <Avatar className="size-9 border-2 border-background shadow-sm">
                                <AvatarImage src={`https://placehold.co/40x40.png?text=${roleLabel.charAt(0)}`} />
                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">{roleLabel.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden flex-grow text-left overflow-hidden">
                                <span className="font-bold truncate text-foreground">{userEmail || roleLabel}</span>
                                <span className="text-muted-foreground text-xs truncate">{roleLabel}</span>
                            </div>
                        </div>
                        <SidebarMenuButton variant="outline" onClick={onLogout} className="w-full justify-center group-data-[collapsible=icon]:hidden hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors h-8 text-xs font-medium">
                            <LogOut className="mr-2 h-3.5 w-3.5" />
                            Log Out
                        </SidebarMenuButton>
                    </div>
                </SidebarFooter>
            </Sidebar>
            <SidebarInset>
                <div className="flex flex-col min-h-screen">
                    <main className="flex-grow p-4 md:p-6 lg:p-8 pb-32 lg:pb-8">
                        <div className="mx-auto max-w-7xl">
                            <div className="flex justify-between items-center mb-6">
                                <div className="lg:hidden">
                                    {!isMobile && <SidebarTrigger />}
                                </div>
                                <div className="ml-auto">
                                    <PortalLanguageToggle />
                                </div>
                            </div>
                            {children}
                        </div>
                    </main>
                    {isMobile && (
                        <>
                            <BottomNav menuItems={menuItems} />
                            {mobileExtras}
                        </>
                    )}
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
