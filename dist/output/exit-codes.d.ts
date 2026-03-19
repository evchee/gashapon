export declare const EXIT: {
    readonly SUCCESS: 0;
    readonly FAILURE: 1;
    readonly USAGE: 2;
    readonly NOT_FOUND: 3;
    readonly PERMISSION: 4;
    readonly CONFLICT: 5;
    readonly TIMEOUT: 6;
    readonly UPSTREAM: 7;
};
export type ExitCode = typeof EXIT[keyof typeof EXIT];
