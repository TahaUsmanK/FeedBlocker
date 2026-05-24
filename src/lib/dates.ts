/** Local calendar date YYYY-MM-DD */
export function localDateString(date = new Date()): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/** Ms until next local midnight */
export function msUntilMidnight(from = new Date()): number {
    const next = new Date(from);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - from.getTime();
}

export function nextMidnightTimestamp(from = new Date()): number {
    return from.getTime() + msUntilMidnight(from);
}

export function isWeekend(date = new Date()): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
}

export function isEvening(date: Date, startHour: number, endHour: number): boolean {
    const hour = date.getHours();
    if (startHour === endHour) return false;
    if (startHour < endHour) {
        return hour >= startHour && hour < endHour;
    }
    return hour >= startHour || hour < endHour;
}
