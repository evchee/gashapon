import type { GashaponConfig } from './schema.js';
export declare function configDir(): string;
export declare function configPath(): string;
export declare function cacheDir(): string;
export declare function serverCacheDir(serverName: string): string;
export declare function binDir(config: GashaponConfig): string;
/** Path to stored OAuth tokens for a server: ~/.config/gashapon/tokens/<name>.json */
export declare function tokenPath(serverName: string): string;
export declare function completionsDir(): string;
