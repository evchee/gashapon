import type { CallToolResult } from '../mcp/client.js';
import type { ToolInfo } from './mapping.js';
interface FormatOpts {
    quiet: boolean;
    json: boolean;
    serverName: string;
    toolName: string;
}
export declare class OutputFormatter {
    format(result: CallToolResult, toolInfo: ToolInfo, opts: FormatOpts): void;
    private emit;
    private emitBare;
}
export {};
