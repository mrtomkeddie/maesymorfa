import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { LunchMenuWithId } from '@/lib/lunchMenu';

// Menus added in the admin area. Until they load (or if loading fails), the site falls back to
// the built-in menu in src/lib/lunchMenu.ts.
export function useLunchMenus() {
    const [menus, setMenus] = useState<LunchMenuWithId[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);

    const reload = useCallback(async () => {
        setIsLoading(true);
        try {
            setMenus(await db.getLunchMenus());
            setLoadFailed(false);
        } catch (error) {
            console.error('Could not load lunch menus:', error);
            setLoadFailed(true);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    return { menus, isLoading, loadFailed, reload };
}
