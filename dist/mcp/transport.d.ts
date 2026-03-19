import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { ServerConfig } from '../config/schema.js';
export declare function createTransport(serverName: string, serverConfig: ServerConfig): Promise<Transport>;
