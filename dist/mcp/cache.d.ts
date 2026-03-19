import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { NounVerbMapping } from '../runtime/mapping.js';
export interface CachedSchema {
    version: string;
    timestamp: string;
    tools: Tool[];
    mapping: NounVerbMapping;
}
export declare class SchemaCache {
    private readonly baseCacheDir;
    constructor(baseCacheDir?: string);
    private cachePath;
    get(serverName: string): Promise<CachedSchema | null>;
    set(serverName: string, schema: CachedSchema): Promise<void>;
    invalidate(serverName: string): Promise<void>;
    isStale(serverName: string, maxAgeMs?: number): Promise<boolean>;
}
