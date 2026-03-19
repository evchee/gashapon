export interface ParsedFlags {
    toolArgs: Record<string, unknown>;
    meta: {
        dryRun: boolean;
        quiet: boolean;
        json: boolean;
        idempotencyKey?: string;
        capabilities: boolean;
        debug: boolean;
    };
}
export declare function parseFlags(argv: string[], inputSchema: Record<string, unknown>): ParsedFlags;
