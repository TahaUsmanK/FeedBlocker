import { useEffect } from 'react';

/** Re-run callback when matching chrome.storage keys change */
export function useStorageListener(
    callback: () => void,
    keyFilter?: (key: string) => boolean,
    area: 'local' | 'session' | 'sync' = 'local'
) {
    useEffect(() => {
        const handler = (
            changes: { [key: string]: chrome.storage.StorageChange },
            changedArea: string
        ) => {
            if (changedArea !== area) return;
            const keys = Object.keys(changes);
            if (!keyFilter || keys.some(keyFilter)) {
                callback();
            }
        };

        chrome.storage.onChanged.addListener(handler);
        return () => chrome.storage.onChanged.removeListener(handler);
    }, [callback, keyFilter, area]);
}

export function isUsageOrSettingsKey(key: string): boolean {
    return key.startsWith('usage:') || key === 'settings' || key === 'limitLocks';
}
