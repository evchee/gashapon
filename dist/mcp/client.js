import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { createTransport } from './transport.js';
import { StructuredError, timeoutError, upstreamError } from '../output/errors.js';
import { EXIT } from '../output/exit-codes.js';
const DEFAULT_TIMEOUT_MS = 30_000;
export class MCPClientWrapper {
    serverName;
    serverConfig;
    timeoutMs;
    client;
    connected = false;
    constructor(serverName, serverConfig, timeoutMs = DEFAULT_TIMEOUT_MS) {
        this.serverName = serverName;
        this.serverConfig = serverConfig;
        this.timeoutMs = timeoutMs;
        this.client = new Client({ name: 'gashapon', version: '0.1.0' }, { capabilities: {} });
    }
    async connect() {
        const transport = await createTransport(this.serverName, this.serverConfig);
        try {
            await withTimeout(this.client.connect(transport), this.timeoutMs, `Connecting to "${this.serverName}" timed out after ${this.timeoutMs}ms`);
            this.connected = true;
        }
        catch (err) {
            if (err instanceof Error && err.message.includes('timed out'))
                throw err;
            // UnauthorizedError: guide user to re-authenticate
            if (err instanceof Error && err.constructor.name === 'UnauthorizedError') {
                throw new StructuredError({
                    code: 'UNAUTHORIZED',
                    message: `Server "${this.serverName}" requires authentication. Run: gashapon auth ${this.serverName}`,
                    exitCode: EXIT.PERMISSION,
                    retryable: false,
                });
            }
            throw upstreamError(`Failed to connect to "${this.serverName}": ${err.message}`, true);
        }
    }
    async listTools() {
        this.assertConnected();
        const tools = [];
        let cursor;
        do {
            const result = await withTimeout(this.client.listTools({ cursor }), this.timeoutMs, 'listTools timed out');
            tools.push(...result.tools);
            cursor = result.nextCursor;
        } while (cursor);
        return tools;
    }
    async callTool(name, args, meta) {
        this.assertConnected();
        const params = { name, arguments: args };
        if (meta?.idempotencyKey) {
            params._meta = { idempotencyKey: meta.idempotencyKey };
        }
        const result = await withTimeout(this.client.callTool(params), this.timeoutMs, `Tool "${name}" timed out`);
        return result;
    }
    async close() {
        if (this.connected) {
            await this.client.close().catch(() => { });
            this.connected = false;
        }
    }
    assertConnected() {
        if (!this.connected) {
            throw upstreamError('MCP client is not connected. Call connect() first.');
        }
    }
}
async function withTimeout(promise, ms, message) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => reject(timeoutError(message)), ms);
    });
    try {
        return await Promise.race([promise, timeout]);
    }
    finally {
        clearTimeout(timer);
    }
}
