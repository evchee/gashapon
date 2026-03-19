import { type GashaponConfig, type ServerConfig } from './schema.js';
export declare class ConfigManager {
    private readonly _configPath;
    constructor(customPath?: string);
    get path(): string;
    load(): Promise<GashaponConfig>;
    save(config: GashaponConfig): Promise<void>;
    addServer(name: string, serverConfig: ServerConfig): Promise<GashaponConfig>;
    removeServer(name: string): Promise<{
        config: GashaponConfig;
        removed: ServerConfig;
    }>;
    getServer(name: string): Promise<ServerConfig | undefined>;
    listServers(): Promise<Record<string, ServerConfig>>;
    updateServer(name: string, updates: Partial<ServerConfig>): Promise<GashaponConfig>;
    forceAddServer(name: string, serverConfig: ServerConfig): Promise<GashaponConfig>;
}
