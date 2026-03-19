import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ServerConfig } from '../config/schema.js';
export interface CallToolResult {
    content: Array<{
        type: string;
        text?: string;
        data?: string;
        mimeType?: string;
    }>;
    isError?: boolean;
}
export declare class MCPClientWrapper {
    private readonly serverName;
    private readonly serverConfig;
    private readonly timeoutMs;
    private client;
    private connected;
    constructor(serverName: string, serverConfig: ServerConfig, timeoutMs?: number);
    connect(): Promise<void>;
    listTools(): Promise<Tool[]>;
    callTool(name: string, args: Record<string, unknown>, meta?: {
        idempotencyKey?: string;
    }): Promise<CallToolResult>;
    close(): Promise<void>;
    private assertConnected;
}
