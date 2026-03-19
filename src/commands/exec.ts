import { Command } from '@oclif/core'
import { ExecutionEngine } from '../runtime/engine.js'
import { SchemaCache } from '../mcp/cache.js'
import { ConfigManager } from '../config/manager.js'

export default class Exec extends Command {
  static description = 'Execute a tool on an MCP server (used by wrapper scripts)'
  static hidden = true
  static strict = false
  static enableJsonFlag = false

  static args = {}
  static flags = {}

  // Skip BaseCommand.init() to avoid oclif rejecting unknown --flags (tool flags)
  public async init(): Promise<void> {
    await super.init()
  }

  async run(): Promise<void> {
    // Parse argv directly from process.argv to avoid oclif flag validation
    // process.argv = ['node', 'run.js', 'exec', '<server>', ...toolArgs]
    const serverName = process.argv[3]
    if (!serverName) {
      process.stderr.write('Usage: capsule exec <server> [args...]\n')
      process.exit(2)
    }
    const toolArgv = process.argv.slice(4)

    const configManager = new ConfigManager()
    const engine = new ExecutionEngine(configManager, new SchemaCache())
    await engine.execute(serverName, toolArgv)
  }
}
