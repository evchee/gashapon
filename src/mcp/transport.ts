import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import type { ServerConfig } from '../config/schema.js'
import { interpolateEnvMap } from '../util/env.js'

export function createTransport(serverConfig: ServerConfig): Transport {
  if (serverConfig.transport === 'stdio') {
    return new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args ?? [],
      env: {
        ...process.env as Record<string, string>,
        ...interpolateEnvMap(serverConfig.env),
      },
    })
  } else {
    const headers = interpolateEnvMap(serverConfig.headers)
    return new StreamableHTTPClientTransport(
      new URL(serverConfig.url),
      {
        requestInit: {
          headers,
        },
      },
    )
  }
}
