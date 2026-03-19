import { Flags } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { isTTY } from '../util/tty.js'

export default class List extends BaseCommand<typeof List> {
  static description = 'List configured MCP servers'

  static flags = {
    ...BaseCommand.baseFlags,
    installed: Flags.boolean({ summary: 'Show only installed servers', default: false }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(List)
    const servers = await this.configManager.listServers()

    let entries = Object.entries(servers)
    if (flags.installed) {
      entries = entries.filter(([, s]) => s.installed)
    }

    const data = entries.map(([name, s]) => ({
      name,
      transport: s.transport,
      installed: s.installed,
      description: s.description ?? '',
    }))

    if (this.isJson() || !isTTY()) {
      this.outputData(data)
      return
    }

    if (data.length === 0) {
      this.log('No servers configured. Run `gashapon add` to register one.')
      return
    }

    // Simple table output for TTY
    const nameW = Math.max(4, ...data.map(r => r.name.length))
    const transW = Math.max(9, ...data.map(r => r.transport.length))
    const header = `${'NAME'.padEnd(nameW)}  ${'TRANSPORT'.padEnd(transW)}  INSTALLED  DESCRIPTION`
    this.log(header)
    this.log('-'.repeat(header.length))
    for (const row of data) {
      this.log(
        `${row.name.padEnd(nameW)}  ${row.transport.padEnd(transW)}  ${String(row.installed).padEnd(9)}  ${row.description}`,
      )
    }
  }
}
