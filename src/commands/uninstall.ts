import { Args } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { SchemaCache } from '../mcp/cache.js'
import { removeWrapper } from '../util/wrapper.js'
import { binDir } from '../config/paths.js'
import { buildReceipt } from '../output/receipt.js'
import { notFound } from '../output/errors.js'

export default class Uninstall extends BaseCommand<typeof Uninstall> {
  static description = 'Remove CLI wrapper and cached schema for an MCP server'

  static args = {
    name: Args.string({ description: 'Server name', required: true }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Uninstall)
    const name = args.name

    const serverConfig = await this.configManager.getServer(name)
    if (!serverConfig) throw notFound(`Server "${name}"`)

    const config = await this.configManager.load()
    const bd = binDir(config)

    await removeWrapper(bd, name).catch(() => { /* already gone */ })

    const cache = new SchemaCache()
    await cache.invalidate(name)

    await this.configManager.updateServer(name, { installed: false })

    const receipt = buildReceipt('uninstall', name, `gashapon install ${name}`)
    this.outputData(receipt)
  }
}
