import type { NounVerbMapping, ToolInfo } from './mapping.js'
import { buildMapping } from './mapping.js'
import { parseFlags } from './flags.js'
import { OutputFormatter } from './formatter.js'
import { MCPClientWrapper } from '../mcp/client.js'
import { SchemaCache } from '../mcp/cache.js'
import { ConfigManager } from '../config/manager.js'
import { EXIT } from '../output/exit-codes.js'
import { StructuredError, notFound, upstreamError } from '../output/errors.js'
import { wrapperName } from '../config/paths.js'
import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export class ExecutionEngine {
  private readonly formatter = new OutputFormatter()

  constructor(
    private readonly configManager: ConfigManager,
    private readonly cache: SchemaCache,
  ) {}

  async execute(serverName: string, argv: string[]): Promise<void> {
    const serverConfig = await this.configManager.getServer(serverName)
    if (!serverConfig) {
      const err = notFound(`Server "${serverName}"`, ['Run `gashapon list` to see available servers'])
      process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n')
      process.exit(EXIT.NOT_FOUND)
    }

    // Load or auto-sync cache (treat stale entries as a refresh trigger but keep as fallback)
    let cached = await this.cache.get(serverName)
    const isStale = cached ? await this.cache.isStale(serverName) : false
    if (!cached || isStale) {
      process.stderr.write(`Cache ${cached ? 'stale' : 'miss'} for "${serverName}", auto-syncing...\n`)
      const refreshClient = new MCPClientWrapper(serverName, serverConfig)
      try {
        await refreshClient.connect()
        try {
          const tools = await refreshClient.listTools()
          const mapping = buildMapping(tools)
          cached = { version: '1', timestamp: new Date().toISOString(), tools, mapping }
          await this.cache.set(serverName, cached)
        } finally {
          await refreshClient.close()
        }
      } catch (err) {
        if (!cached) {
          // No usable cache at all — re-throw so the caller sees the real error
          throw err
        }
        // Stale cache is still usable; warn and continue with what we have
        process.stderr.write(`Auto-sync failed (${(err as Error).message}); using stale cache for "${serverName}"\n`)
      }
    }

    const { mapping, tools } = cached

    // Short-circuit: --capabilities
    if (argv.includes('--capabilities')) {
      this.outputCapabilities(serverName, mapping, tools as Tool[])
      return
    }

    // Short-circuit: schema <command>
    if (argv[0] === 'schema') {
      this.outputSchema(argv.slice(1), mapping, tools as Tool[])
      return
    }

    // Short-circuit: --help or no args
    if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
      // Try to resolve a command first — if found, show per-command help
      const helpArgv = argv.filter(a => a !== '--help' && a !== '-h')
      if (helpArgv.length > 0) {
        const { toolName: helpTool } = this.resolveCommand(helpArgv, mapping)
        if (helpTool) {
          const helpToolObj = (tools as Tool[]).find(t => t.name === helpTool)
          if (helpToolObj) {
            this.outputCommandHelp(serverName, helpTool, mapping, helpToolObj)
            return
          }
        }
      }
      this.outputHelp(serverName, mapping)
      return
    }

    // Resolve noun-verb command
    const { toolName, remainingArgv } = this.resolveCommand(argv, mapping)

    if (!toolName) {
      const err = new StructuredError({
        code: 'COMMAND_NOT_FOUND',
        message: `Unknown command: ${argv.slice(0, 2).join(' ')}`,
        exitCode: EXIT.NOT_FOUND,
        suggestions: [`Run \`${serverName} --help\` to see available commands`],
      })
      process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n')
      process.exit(EXIT.NOT_FOUND)
    }

    const tool = (tools as Tool[]).find(t => t.name === toolName)
    if (!tool) {
      const err = notFound(`Tool "${toolName}"`)
      process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n')
      process.exit(EXIT.NOT_FOUND)
    }

    const toolInfo = this.findToolInfo(toolName, mapping)

    // Parse flags against schema
    let parsed
    try {
      parsed = parseFlags(remainingArgv, tool.inputSchema as Record<string, unknown>)
    } catch (err) {
      if (err instanceof StructuredError) {
        process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n')
        process.exit(err.exitCode)
      }
      throw err
    }

    const { meta, toolArgs } = parsed

    // Handle --dry-run
    if (meta.dryRun) {
      const dryResult = {
        dry_run: true,
        would_execute: {
          server: serverName,
          tool: toolName,
          arguments: toolArgs,
          destructive: toolInfo?.annotations?.destructiveHint ?? false,
        },
      }
      process.stdout.write(JSON.stringify(dryResult, null, 2) + '\n')
      return
    }

    // Connect and call
    const client = new MCPClientWrapper(serverName, serverConfig)
    try {
      await client.connect()
    } catch (err) {
      if (err instanceof StructuredError) {
        process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n')
        process.exit(err.exitCode)
      }
      const structured = upstreamError((err as Error).message)
      process.stdout.write(JSON.stringify(structured.toJSON(), null, 2) + '\n')
      process.exit(EXIT.UPSTREAM)
    }

    try {
      const result = await client.callTool(toolName, toolArgs, {
        idempotencyKey: meta.idempotencyKey,
      })

      this.formatter.format(result, toolInfo ?? { mcpName: toolName, inputSchema: {} }, {
        quiet: meta.quiet,
        json: meta.json,
        serverName,
        toolName,
      })

      process.exit(result.isError ? EXIT.FAILURE : EXIT.SUCCESS)
    } finally {
      await client.close()
    }
  }

  private resolveCommand(argv: string[], mapping: NounVerbMapping): { toolName: string | null; remainingArgv: string[] } {
    // Skip flags at start when resolving command
    const nonFlagArgv = argv.filter(a => !a.startsWith('-'))

    // Try 2-token: "noun verb"
    if (nonFlagArgv.length >= 2) {
      const twoToken = `${nonFlagArgv[0]} ${nonFlagArgv[1]}`
      if (mapping.forward[twoToken]) {
        // Remove the two command tokens from argv
        const remaining = this.removeTokens(argv, [nonFlagArgv[0], nonFlagArgv[1]])
        return { toolName: mapping.forward[twoToken], remainingArgv: remaining }
      }
    }

    // Try 1-token
    if (nonFlagArgv.length >= 1) {
      const oneToken = nonFlagArgv[0]
      if (mapping.forward[oneToken]) {
        const remaining = this.removeTokens(argv, [oneToken])
        return { toolName: mapping.forward[oneToken], remainingArgv: remaining }
      }
    }

    return { toolName: null, remainingArgv: argv }
  }

  private removeTokens(argv: string[], tokens: string[]): string[] {
    const result = [...argv]
    for (const token of tokens) {
      const idx = result.findIndex(a => a === token && !a.startsWith('-'))
      if (idx !== -1) result.splice(idx, 1)
    }
    return result
  }

  private findToolInfo(toolName: string, mapping: NounVerbMapping): ToolInfo | undefined {
    for (const noun of Object.values(mapping.tree)) {
      for (const info of Object.values(noun)) {
        if (info.mcpName === toolName) return info
      }
    }
    return undefined
  }

  private outputCapabilities(serverName: string, mapping: NounVerbMapping, tools: Tool[]): void {
    const commands: Record<string, { destructive: boolean; dry_run: boolean; idempotent: boolean; description?: string; flags: Record<string, { type: string; required: boolean; description?: string; enum?: string[] }> }> = {}
    for (const tool of tools) {
      const cliKey = mapping.reverse[tool.name] ?? tool.name
      const ann = tool.annotations as { readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean } | undefined
      const schema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string; enum?: string[] }>; required?: string[] } | undefined
      const props = schema?.properties ?? {}
      const reqSet = new Set(schema?.required ?? [])
      const flags: Record<string, { type: string; required: boolean; description?: string; enum?: string[] }> = {}
      for (const [name, prop] of Object.entries(props)) {
        flags[name] = {
          type: prop.type ?? 'string',
          required: reqSet.has(name),
          ...(prop.description ? { description: prop.description } : {}),
          ...(prop.enum ? { enum: prop.enum } : {}),
        }
      }
      commands[cliKey] = {
        destructive: ann?.destructiveHint ?? false,
        dry_run: true,
        idempotent: ann?.idempotentHint ?? (ann?.destructiveHint === true ? false : true),
        ...(tool.description ? { description: tool.description } : {}),
        flags,
      }
    }
    const manifest = {
      name: serverName,
      version: '0.1.0',
      commands,
    }
    process.stdout.write(JSON.stringify(manifest, null, 2) + '\n')
  }

  private outputSchema(schemaArgv: string[], mapping: NounVerbMapping, tools: Tool[]): void {
    // Resolve command name from remaining argv
    const cmd = schemaArgv.filter(a => !a.startsWith('-'))
    let toolName: string | null = null

    if (cmd.length >= 2) {
      const twoToken = `${cmd[0]} ${cmd[1]}`
      if (mapping.forward[twoToken]) toolName = mapping.forward[twoToken]
    }
    if (!toolName && cmd.length >= 1 && mapping.forward[cmd[0]]) {
      toolName = mapping.forward[cmd[0]]
    }

    if (!toolName) {
      process.stdout.write(JSON.stringify({ error: 'Command not found' }) + '\n')
      process.exit(EXIT.NOT_FOUND)
    }

    const tool = tools.find(t => t.name === toolName)
    if (!tool) {
      process.stdout.write(JSON.stringify({ error: 'Tool not found' }) + '\n')
      process.exit(EXIT.NOT_FOUND)
    }

    const result = {
      command: mapping.reverse[toolName] ?? toolName,
      mcp_tool: toolName,
      input_schema: tool.inputSchema,
      output_schema: tool.outputSchema ?? null,
      annotations: tool.annotations ?? null,
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  }

  private outputHelp(serverName: string, mapping: NounVerbMapping): void {
    const bin = wrapperName(serverName)
    const lines: string[] = [
      `Usage: ${bin} <command> [flags]`,
      `       ${bin} <command> '{"flag": "value"}'   (JSON blob accepted as positional arg)`,
      '',
      'Commands:',
    ]
    for (const [noun, verbs] of Object.entries(mapping.tree)) {
      if (noun === '_root') {
        for (const [verb, info] of Object.entries(verbs)) {
          lines.push(`  ${verb.padEnd(30)} ${info.description ?? ''}`)
        }
      } else {
        for (const [verb, info] of Object.entries(verbs)) {
          lines.push(`  ${noun} ${verb.padEnd(28)} ${info.description ?? ''}`)
        }
      }
    }
    lines.push(
      '',
      'Discovery:',
      `  ${bin} --capabilities         Full manifest with all commands and their flags`,
      `  ${bin} <command> --help       Per-command flag reference`,
      `  ${bin} schema <command>       Raw JSON schema for a command`,
      '',
      'Global flags:',
      '  --capabilities   Show full command manifest (JSON)',
      '  --json           Output as JSON',
      '  --dry-run        Preview without executing',
      '  --quiet, -q      Bare output',
    )
    process.stdout.write(lines.join('\n') + '\n')
  }

  private outputCommandHelp(serverName: string, toolName: string, mapping: NounVerbMapping, tool: Tool): void {
    const bin = wrapperName(serverName)
    const cliKey = mapping.reverse[toolName] ?? toolName
    const schema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string; enum?: string[] }>; required?: string[] } | undefined
    const props = schema?.properties ?? {}
    const reqSet = new Set(schema?.required ?? [])

    const lines: string[] = [
      `${tool.description ?? cliKey}`,
      '',
      `Usage: ${bin} ${cliKey} [flags]`,
      `       ${bin} ${cliKey} '{"flag": "value"}'`,
      '',
    ]

    if (Object.keys(props).length > 0) {
      lines.push('Flags:')
      for (const [name, prop] of Object.entries(props)) {
        const req = reqSet.has(name) ? ' (required)' : ''
        const type = prop.type ?? 'string'
        const desc = prop.description ? `  ${prop.description}` : ''
        const enumHint = prop.enum ? `  [${prop.enum.join('|')}]` : ''
        lines.push(`  --${name} <${type}>${req}${desc}${enumHint}`)
      }
    } else {
      lines.push('  (no flags)')
    }

    lines.push(
      '',
      'Global flags:',
      '  --dry-run        Preview without executing',
      '  --json           Output as JSON',
      '  --quiet, -q      Bare output',
    )

    process.stdout.write(lines.join('\n') + '\n')
  }
}
