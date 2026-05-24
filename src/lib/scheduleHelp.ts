import { ScheduleSettings } from '../types';

/** User-facing explanation of evening window including overnight spans */
export function describeEveningWindow(schedule: ScheduleSettings): string {
    const { eveningStartHour: start, eveningEndHour: end } = schedule;
    if (start === end) {
        return 'Evening schedule is off (start and end hour are the same).';
    }
    if (start < end) {
        return `Evening caps apply from ${start}:00 to ${end}:00 (same calendar day).`;
    }
    return `Evening caps apply from ${start}:00 through midnight until ${end}:00 the next morning (overnight window).`;
}
