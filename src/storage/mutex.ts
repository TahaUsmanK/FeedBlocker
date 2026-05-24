/** Serialize storage writes to prevent read-modify-write races across tabs */
let chain: Promise<void> = Promise.resolve();

export function withStorageLock<T>(fn: () => Promise<T>): Promise<T> {
    const run = chain.then(fn);
    chain = run.then(
        () => undefined,
        () => undefined
    );
    return run;
}
