'use client';

import { useEffect } from 'react';
import { toast } from '@/hooks/use-toast';

// Registers /sw.js and checks for a new version on launch, on refocus and every 30 minutes.
// Production only: a service worker fights the dev server's hot reload.
export function ServiceWorkerRegister() {
    useEffect(() => {
        if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;

        const hadController = !!navigator.serviceWorker.controller;
        let reloading = false;
        let interval: ReturnType<typeof setInterval> | undefined;
        let check = () => {};

        navigator.serviceWorker
            .register('/sw.js', { updateViaCache: 'none' })
            .then((reg) => {
                check = () => {
                    if (document.visibilityState === 'visible') reg.update().catch(() => {});
                };
                check();
                document.addEventListener('visibilitychange', check);
                window.addEventListener('focus', check);
                window.addEventListener('pageshow', check);
                interval = setInterval(check, 30 * 60 * 1000);
            })
            .catch(() => {});

        // Never reload over live work: a game in progress or a half-typed form.
        const isBusy = () => {
            if (window.location.pathname.startsWith('/play')) return true;
            const el = document.activeElement;
            return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');
        };

        const onControllerChange = () => {
            if (reloading || !hadController) return; // the first-ever install must not reload
            if (isBusy()) {
                toast({ title: 'Update ready', description: 'It will apply next time you open the app.' });
                return;
            }
            reloading = true;
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
            document.removeEventListener('visibilitychange', check);
            window.removeEventListener('focus', check);
            window.removeEventListener('pageshow', check);
            if (interval) clearInterval(interval);
        };
    }, []);

    return null;
}
