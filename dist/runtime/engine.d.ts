import { SchemaCache } from '../mcp/cache.js';
import { ConfigManager } from '../config/manager.js';
export declare class ExecutionEngine {
    private readonly configManager;
    private readonly cache;
    private readonly formatter;
    constructor(configManager: ConfigManager, cache: SchemaCache);
    execute(serverName: string, argv: string[]): Promise<void>;
    private resolveCommand;
    private removeTokens;
    private findToolInfo;
    private outputCapabilities;
    private outputSchema;
    private outputHelp;
}
