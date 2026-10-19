import type { ReactNode } from 'react';

// The heading band at the top of every inner page, so they all match. The pale sky fade
// picks up the homepage hero, which fades from night sky to white.
export function PageHeader({ title, intro, before, children }: { title: ReactNode; intro?: ReactNode; before?: ReactNode; children?: ReactNode }) {
    return (
        <section className="w-full bg-gradient-to-b from-sky-50 to-background">
            <div className="container mx-auto max-w-4xl px-6 pb-10 pt-12 text-center md:px-8 md:pb-14 md:pt-20">
                {before}
                <h1 className="font-headline text-4xl font-extrabold tracking-tight text-foreground md:text-6xl">{title}</h1>
                {intro && <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{intro}</p>}
                {children}
            </div>
        </section>
    );
}
