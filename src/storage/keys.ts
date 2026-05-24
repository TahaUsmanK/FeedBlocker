import { localDateString } from '../lib/dates';

/** Legacy monolithic key — migrated to sharded keys on read */
export const LEGACY_USAGE_KEY = 'usage';

export function usageKeyForDate(date: string): string {
    return `usage:${date}`;
}

export function todayUsageKey(): string {
    return usageKeyForDate(localDateString());
}

export function isUsageStorageKey(key: string): boolean {
    return key.startsWith('usage:');
}
