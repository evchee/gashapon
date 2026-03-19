import type { Tool } from '@modelcontextprotocol/sdk/types.js';
export interface ToolInfo {
    mcpName: string;
    description?: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    annotations?: {
        readOnlyHint?: boolean;
        destructiveHint?: boolean;
        idempotentHint?: boolean;
    };
}
export interface NounVerbMapping {
    /** "channels list" → "list_channels" */
    forward: Record<string, string>;
    /** "list_channels" → "channels list" */
    reverse: Record<string, string>;
    /** noun → verb → ToolInfo, for help/discovery */
    tree: Record<string, Record<string, ToolInfo>>;
}
export declare function buildMapping(tools: Tool[]): NounVerbMapping;
