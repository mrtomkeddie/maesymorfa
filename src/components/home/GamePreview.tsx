'use client';

import { useEffect, useRef, useState } from 'react';

// Runs the Morfa Runner preview only while it is on screen, so the homepage
// does not load the game or spend battery when the visitor is elsewhere on the page.
export function GamePreview({ title }: { title: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el || !('IntersectionObserver' in window)) {
            setVisible(true);
            return;
        }
        const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '200px 0px' });
        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div ref={ref} className="absolute inset-0">
            {visible && (
                <iframe
                    src="/morfa-runner/index.html?preview=true"
                    className="w-full h-full border-0 pointer-events-none"
                    title={title}
                    tabIndex={-1}
                    loading="lazy"
                />
            )}
        </div>
    );
}
