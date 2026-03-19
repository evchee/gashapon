import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { MCPClientWrapper } from '../mcp/client.js'
import { SchemaCache } from '../mcp/cache.js'
import { buildMapping } from '../runtime/mapping.js'
import { generateWrapper } from '../util/wrapper.js'
import { binDir } from '../config/paths.js'
import { buildReceipt } from '../output/receipt.js'
import { notFound } from '../output/errors.js'

export default class Install extends BaseCommand<typeof Install> {
  static description = 'Connect to MCP server, discover tools, and install CLI wrapper'

  static args = {
    name: Args.string({ description: 'Server name', required: true }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    force: Flags.boolean({ summary: 'Re-install even if already installed', default: false }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Install)
    const name = args.name

    const serverConfig = await this.configManager.getServer(name)
    if (!serverConfig) throw notFound(`Server "${name}"`, [`Run \`gashapon list\` to see available servers`])

    if (serverConfig.installed && !flags.force) {
      this.log(`Server "${name}" is already installed. Use --force to reinstall.`)
      return
    }

    process.stderr.write(`Connecting to "${name}"...\n`)
    const client = new MCPClientWrapper(name, serverConfig)
    await client.connect()

    process.stderr.write('Discovering tools...\n')
    const tools = await client.listTools()
    await client.close()

    process.stderr.write(`Found ${tools.length} tool(s). Building command mapping...\n`)
    const mapping = buildMapping(tools)

    const cache = new SchemaCache()
    await cache.set(name, {
      version: '1',
      timestamp: new Date().toISOString(),
      tools,
      mapping,
    })

    const config = await this.configManager.load()
    const bd = binDir(config)
    await generateWrapper(bd, name)
    await this.configManager.updateServer(name, { installed: true })

    // PATH advisory
    if (!process.env.PATH?.split(':').includes(bd)) {
      process.stderr.write(`\nAdd gashapon bin to PATH:\n  export PATH="${bd}:$PATH"\n\n`)
    }

    const receipt = buildReceipt('install', name, `gashapon uninstall ${name}`)
    this.outputData(receipt)
  }
}
