import { Args } from '@oclif/core'
import { BaseCommand } from '../base-command.js'
import { buildReceipt } from '../output/receipt.js'
import { removeWrapper } from '../util/wrapper.js'
import { binDir } from '../config/paths.js'

export default class Remove extends BaseCommand<typeof Remove> {
  static description = 'Remove an MCP server from capsule config'

  static args = {
    name: Args.string({ description: 'Server name', required: true }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
  }

  async run(): Promise<void> {
    const { args } = await this.parse(Remove)
    const { removed, config } = await this.configManager.removeServer(args.name)

    // If installed, remove wrapper
    if (removed.installed) {
      const bd = binDir(config)
      await removeWrapper(bd, args.name).catch(() => { /* best effort */ })
    }

    // Build undo command using base64-encoded JSON
    const configJson = JSON.stringify({ ...removed, installed: false })
    const b64 = Buffer.from(configJson).toString('base64')
    const undoCmd = `capsule add ${args.name} --from-json-b64 ${b64}`

    const receipt = buildReceipt('remove', args.name, undoCmd)
    this.outputData(receipt)
  }
}
