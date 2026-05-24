export const SESSION_IDLE_RESET_MS = 5 * 60 * 1000;

export class SessionTracker {
    private sessionSeconds = 0;

    tick(isActive: boolean, msSinceActivity: number): number {
        if (isActive) {
            this.sessionSeconds += 1;
        } else if (msSinceActivity >= SESSION_IDLE_RESET_MS) {
            this.sessionSeconds = 0;
        }
        return this.sessionSeconds;
    }

    reset(): void {
        this.sessionSeconds = 0;
    }

    getSeconds(): number {
        return this.sessionSeconds;
    }
}
