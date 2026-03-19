import { Command, Flags, Interfaces } from '@oclif/core'
import { ConfigManager } from './config/manager.js'
import { StructuredError } from './output/errors.js'
import { EXIT } from './output/exit-codes.js'
import { isTTY } from './util/tty.js'

export type BaseFlags<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand.baseFlags & T['flags']
>

export abstract class BaseCommand<T extends typeof Command> extends Command {
  static baseFlags = {
    debug: Flags.boolean({
      helpGroup: 'GLOBAL',
      summary: 'Enable debug output (raw JSON-RPC, stack traces)',
      default: false,
    }),
    quiet: Flags.boolean({
      char: 'q',
      helpGroup: 'GLOBAL',
      summary: 'Output bare values only',
      default: false,
    }),
  }

  static enableJsonFlag = true

  protected flags!: BaseFlags<T>
  private _configManager?: ConfigManager

  protected get configManager(): ConfigManager {
    this._configManager ??= new ConfigManager()
    return this._configManager
  }

  protected isJson(): boolean {
    return this.jsonEnabled()
  }

  protected isQuiet(): boolean {
    return (this.flags as { quiet?: boolean }).quiet ?? false
  }

  /**
   * Output data respecting --json, --quiet, and TTY detection.
   * JSON goes to stdout; decorative text to stderr.
   */
  protected outputData(data: unknown): void {
    if (this.isJson() || !isTTY()) {
      process.stdout.write(JSON.stringify(data, null, 2) + '\n')
    } else if (this.isQuiet()) {
      this.logBare(data)
    } else {
      process.stdout.write(JSON.stringify(data, null, 2) + '\n')
    }
  }

  private logBare(data: unknown): void {
    if (Array.isArray(data)) {
      for (const item of data) process.stdout.write(String(item) + '\n')
    } else if (data !== null && typeof data === 'object') {
      const vals = Object.values(data)
      if (vals.length === 1) {
        process.stdout.write(String(vals[0]) + '\n')
      } else {
        process.stdout.write(JSON.stringify(data) + '\n')
      }
    } else {
      process.stdout.write(String(data) + '\n')
    }
  }

  protected outputError(err: StructuredError): void {
    process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n')
  }

  public async init(): Promise<void> {
    await super.init()
    const { flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    })
    this.flags = flags as BaseFlags<T>
  }

  protected async catch(err: Error & { exitCode?: number }): Promise<unknown> {
    if (err instanceof StructuredError) {
      this.outputError(err)
      process.exit(err.exitCode)
    }
    if ((this.flags as { debug?: boolean }).debug) {
      process.stderr.write(err.stack ?? err.message)
      process.stderr.write('\n')
    }
    const structured = new StructuredError({
      code: 'INTERNAL_ERROR',
      message: err.message,
      exitCode: EXIT.FAILURE,
    })
    this.outputError(structured)
    process.exit(EXIT.FAILURE)
  }
}
