import { Args } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { ExecutionEngine } from '../runtime/engine.js'
import { SchemaCache } from '../mcp/cache.js'

export default class Exec extends BaseCommand<typeof Exec> {
  static description = 'Execute a tool on an MCP server (used by wrapper scripts)'
  static hidden = true
  static strict = false

  static args = {
    server: Args.string({ description: 'Server name', required: true }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run(): Promise<void> {
    const { args, argv } = await this.parse(Exec)
    const serverName = args.server
    // Remove 'exec' and server name from argv to get remaining args
    const rawArgv = process.argv.slice(3) // skip: node, bin/run.js, 'exec'
    // Actually we need to find what comes after the server name
    const serverIdx = (argv as string[]).indexOf(serverName)
    const remainingArgv = (argv as string[]).slice(serverIdx + 1)

    const engine = new ExecutionEngine(this.configManager, new SchemaCache())
    await engine.execute(serverName, remainingArgv)
  }
}
