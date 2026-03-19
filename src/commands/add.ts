import { Args, Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { ServerConfigSchema, type ServerConfig } from '../config/schema.js'
import { buildReceipt } from '../output/receipt.js'
import { usageError } from '../output/errors.js'

export default class Add extends BaseCommand<typeof Add> {
  static description = 'Register an MCP server in capsule config'

  static examples = [
    '<%= config.bin %> add slack -- npx -y @slack/mcp-server',
    '<%= config.bin %> add github --url https://mcp.github.com --header "Authorization=Bearer ${GITHUB_TOKEN}"',
    '<%= config.bin %> add myserver --transport stdio --command python --args "-m,myserver"',
  ]

  static strict = false

  static args = {
    name: Args.string({ description: 'Server name (lowercase alphanumeric, hyphens, underscores)', required: true }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    transport: Flags.string({
      summary: 'Transport type',
      options: ['stdio', 'http'],
    }),
    command: Flags.string({ summary: 'Command to run (stdio transport)' }),
    args: Flags.string({ summary: 'Comma-separated args for the command' }),
    env: Flags.string({ summary: 'Environment variable KEY=VAL', multiple: true }),
    url: Flags.string({ summary: 'Server URL (http transport)' }),
    header: Flags.string({ summary: 'HTTP header KEY=VAL', multiple: true }),
    description: Flags.string({ char: 'd', summary: 'Human-readable description' }),
    force: Flags.boolean({ summary: 'Overwrite if server already exists', default: false }),
    'from-json-b64': Flags.string({ summary: 'Base64-encoded JSON server config (used by undo commands)' }),
  }

  async run(): Promise<void> {
    const { args, flags, argv } = await this.parse(Add)
    const name = args.name

    // Handle --from-json-b64 (undo command path)
    if (flags['from-json-b64']) {
      const decoded = Buffer.from(flags['from-json-b64'], 'base64').toString('utf8')
      const serverConfig = ServerConfigSchema.parse(JSON.parse(decoded))
      if (flags.force) {
        await this.configManager.forceAddServer(name, serverConfig)
      } else {
        await this.configManager.addServer(name, serverConfig)
      }
      const receipt = buildReceipt('add', name, `capsule remove ${name}`)
      this.outputData(receipt)
      return
    }

    let serverConfig: ServerConfig

    // Check for passthrough style: capsule add <name> -- <command> [args...]
    // Note: oclif consumes '--' before we see it in argv, so we check process.argv directly
    const rawSeparatorIdx = process.argv.indexOf('--')
    if (rawSeparatorIdx !== -1) {
      const passthrough = process.argv.slice(rawSeparatorIdx + 1)
      if (passthrough.length === 0) throw usageError('Command required after --')
      const [cmd, ...cmdArgs] = passthrough
      const envMap = parseKeyVal(flags.env ?? [])
      serverConfig = {
        transport: 'stdio',
        command: cmd,
        args: cmdArgs,
        env: envMap,
        installed: false,
        description: flags.description,
      }
    } else if (flags.url) {
      // HTTP transport
      const headers = parseKeyVal(flags.header ?? [])
      serverConfig = {
        transport: 'http',
        url: flags.url,
        headers,
        installed: false,
        description: flags.description,
      }
    } else if (flags.transport === 'stdio' || flags.command) {
      if (!flags.command) throw usageError('--command is required for stdio transport')
      const cmdArgs = flags.args ? flags.args.split(',') : []
      const envMap = parseKeyVal(flags.env ?? [])
      serverConfig = {
        transport: 'stdio',
        command: flags.command,
        args: cmdArgs,
        env: envMap,
        installed: false,
        description: flags.description,
      }
    } else {
      throw usageError(
        'Specify transport: use `-- <command>` for stdio, or `--url <url>` for http',
        ['Example: capsule add myserver -- npx -y @my/mcp-server',
          'Example: capsule add myserver --url https://mcp.example.com'],
      )
    }

    if (flags.force) {
      await this.configManager.forceAddServer(name, serverConfig)
    } else {
      await this.configManager.addServer(name, serverConfig)
    }

    const receipt = buildReceipt('add', name, `capsule remove ${name}`)
    this.outputData(receipt)
  }
}

function parseKeyVal(pairs: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) throw usageError(`Invalid KEY=VAL pair: "${pair}"`)
    result[pair.slice(0, eqIdx)] = pair.slice(eqIdx + 1)
  }
  return result
}
