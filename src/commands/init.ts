import { Flags } from '@oclif/core'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { BaseCommand } from '../base-command.js'
import { binDir } from '../config/paths.js'

const MARKER = '# gashapon PATH'

type ShellKind = 'fish' | 'posix'

/** Detect the user's login shell. */
function detectShell(): ShellKind {
  const shell = process.env.SHELL ?? ''
  return shell.endsWith('fish') ? 'fish' : 'posix'
}

/** Detect the user's login shell config file. */
function shellConfigFile(shell: ShellKind): string {
  if (shell === 'fish') return path.join(os.homedir(), '.config', 'fish', 'config.fish')
  const s = process.env.SHELL ?? ''
  if (s.endsWith('zsh')) return path.join(os.homedir(), '.zshrc')
  return path.join(os.homedir(), '.bashrc')
}

/** Build the PATH export line appropriate for the shell. */
function pathLine(shell: ShellKind, binPath: string, marker: string): string {
  if (shell === 'fish') {
    return `fish_add_path "${binPath}"  ${marker}`
  }
  return `export PATH="${binPath}:$PATH"  ${marker}`
}

export default class Init extends BaseCommand<typeof Init> {
  static description = 'Add gashapon bin directory to PATH in your shell config'

  static examples = [
    '<%= config.bin %> init',
    '<%= config.bin %> init --print',
  ]

  static flags = {
    ...BaseCommand.baseFlags,
    print: Flags.boolean({
      summary: 'Print the export line instead of writing to shell config',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Init)

    const config = await this.configManager.load()
    const bd = binDir(config)
    const shell = detectShell()
    const exportLine = pathLine(shell, bd, MARKER)

    if (flags.print) {
      process.stdout.write(exportLine + '\n')
      return
    }

    const configFile = shellConfigFile(shell)
    let contents = ''
    try {
      contents = await fs.readFile(configFile, 'utf8')
    } catch { /* file may not exist yet */ }

    if (contents.includes(MARKER)) {
      process.stderr.write(`gashapon PATH already present in ${configFile}\n`)
      process.stderr.write(`Restart your shell or run: source ${configFile}\n`)
      return
    }

    await fs.appendFile(configFile, `\n${exportLine}\n`)
    process.stderr.write(`Added to ${configFile}:\n  ${exportLine}\n`)
    process.stderr.write(`Restart your shell or run: source ${configFile}\n`)
  }
}
