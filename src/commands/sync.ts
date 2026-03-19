import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { MCPClientWrapper } from '../mcp/client.js'
import { SchemaCache } from '../mcp/cache.js'
import { buildMapping } from '../runtime/mapping.js'
import { notFound } from '../output/errors.js'

export default class Sync extends BaseCommand<typeof Sync> {
  static description = 'Re-discover tools for installed MCP server(s) and update cache'

  static args = {
    name: Args.string({ description: 'Server name (omit for --all)' }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    all: Flags.boolean({ summary: 'Sync all installed servers', default: false }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Sync)
    const servers = await this.configManager.listServers()

    let names: string[]
    if (flags.all) {
      names = Object.entries(servers).filter(([, s]) => s.installed).map(([n]) => n)
    } else if (args.name) {
      if (!servers[args.name]) throw notFound(`Server "${args.name}"`)
      names = [args.name]
    } else {
      this.error('Specify a server name or --all')
    }

    const results = []
    const cache = new SchemaCache()

    for (const name of names) {
      const serverConfig = servers[name]
      process.stderr.write(`Syncing "${name}"...\n`)

      const prev = await cache.get(name)
      const prevNames = new Set(prev?.tools.map(t => t.name) ?? [])

      const client = new MCPClientWrapper(name, serverConfig)
      await client.connect()
      const tools = await client.listTools()
      await client.close()

      const currNames = new Set(tools.map(t => t.name))
      const added = tools.filter(t => !prevNames.has(t.name)).map(t => t.name)
      const removed = [...prevNames].filter(n => !currNames.has(n))

      const mapping = buildMapping(tools)
      await cache.set(name, { version: '1', timestamp: new Date().toISOString(), tools, mapping })

      results.push({ name, tools: tools.length, added, removed })
    }

    this.outputData({ success: true, synced: results })
  }
}
