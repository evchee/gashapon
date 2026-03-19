import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import type { ServerConfig } from '../config/schema.js'
import { createTransport } from './transport.js'
import { timeoutError, upstreamError } from '../output/errors.js'

const DEFAULT_TIMEOUT_MS = 30_000

export interface CallToolResult {
  content: Array<{ type: string; text?: string; data?: string; mimeType?: string }>
  isError?: boolean
}

export class MCPClientWrapper {
  private client: Client
  private connected = false

  constructor(
    private readonly serverName: string,
    private readonly serverConfig: ServerConfig,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.client = new Client(
      { name: 'gashapon', version: '0.1.0' },
      { capabilities: {} },
    )
  }

  async connect(): Promise<void> {
    const transport = createTransport(this.serverConfig)
    try {
      await withTimeout(
        this.client.connect(transport),
        this.timeoutMs,
        `Connecting to "${this.serverName}" timed out after ${this.timeoutMs}ms`,
      )
      this.connected = true
    } catch (err) {
      if (err instanceof Error && err.message.includes('timed out')) throw err
      throw upstreamError(
        `Failed to connect to "${this.serverName}": ${(err as Error).message}`,
        true,
      )
    }
  }

  async listTools(): Promise<Tool[]> {
    this.assertConnected()
    const tools: Tool[] = []
    let cursor: string | undefined
    do {
      const result = await withTimeout(
        this.client.listTools({ cursor }),
        this.timeoutMs,
        'listTools timed out',
      )
      tools.push(...result.tools)
      cursor = result.nextCursor
    } while (cursor)
    return tools
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
    meta?: { idempotencyKey?: string },
  ): Promise<CallToolResult> {
    this.assertConnected()
    const params: Record<string, unknown> = { name, arguments: args }
    if (meta?.idempotencyKey) {
      params._meta = { idempotencyKey: meta.idempotencyKey }
    }
    const result = await withTimeout(
      this.client.callTool(params as { name: string; arguments?: Record<string, unknown>; _meta?: Record<string, unknown> }),
      this.timeoutMs,
      `Tool "${name}" timed out`,
    )
    return result as CallToolResult
  }

  async close(): Promise<void> {
    if (this.connected) {
      await this.client.close().catch(() => { /* best effort */ })
      this.connected = false
    }
  }

  private assertConnected(): void {
    if (!this.connected) {
      throw upstreamError('MCP client is not connected. Call connect() first.')
    }
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timeoutError(message)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}
