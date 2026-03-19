import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({ name: 'mock-server', version: '1.0.0' })

server.tool('list_channels', 'List available channels', { limit: z.number().optional() }, async ({ limit }) => {
  const channels = [{ id: 'ch1', name: 'general' }, { id: 'ch2', name: 'random' }].slice(0, limit ?? 10)
  return { content: [{ type: 'text', text: JSON.stringify(channels) }] }
})

server.tool('send_message', 'Send a message to a channel', {
  channel: z.string(),
  text: z.string(),
}, async ({ channel, text }) => {
  return { content: [{ type: 'text', text: JSON.stringify({ ok: true, channel, text, ts: Date.now() }) }] }
})

server.tool('get_user', 'Get user details', { user_id: z.string() }, async ({ user_id }) => {
  return { content: [{ type: 'text', text: JSON.stringify({ id: user_id, name: 'Test User' }) }] }
})

server.tool('search', 'Search messages', { query: z.string() }, async ({ query }) => {
  return { content: [{ type: 'text', text: JSON.stringify({ query, results: [] }) }] }
})

const transport = new StdioServerTransport()
await server.connect(transport)
