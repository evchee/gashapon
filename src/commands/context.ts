import { BaseCommand } from '../base-command.js'
import { SchemaCache } from '../mcp/cache.js'

export default class Context extends BaseCommand<typeof Context> {
  static description = 'Show inventory of all gashapon-managed CLIs (for AI agents)'

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run(): Promise<void> {
    await this.parse(Context)
    const servers = await this.configManager.listServers()
    const cache = new SchemaCache()

    // Read version from package.json
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const pkg = require('../../package.json') as { version: string }
    const version = pkg.version

    const clis = []
    for (const [name, serverConfig] of Object.entries(servers)) {
      if (!serverConfig.installed) continue
      const cached = await cache.get(name)
      const keyCommands = cached
        ? Object.keys(cached.mapping.forward).slice(0, 5)
        : []
      clis.push({
        binary: name,
        description: serverConfig.description ?? `MCP server: ${name}`,
        key_commands: keyCommands,
        capabilities_cmd: `${name} --capabilities`,
      })
    }

    const output = {
      managed_by: 'gashapon',
      gashapon_version: version,
      config: this.configManager.path,
      clis,
      hint: 'Run `<binary> --capabilities` for full command list. All CLIs output JSON when stdout is not a TTY.',
    }

    this.outputData(output)
  }
}
