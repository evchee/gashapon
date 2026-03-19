import fs from 'node:fs/promises'
import path from 'node:path'
import type { NounVerbMapping } from '../runtime/mapping.js'
import { completionsDir } from '../config/paths.js'

export async function generateCompletions(serverName: string, mapping: NounVerbMapping): Promise<void> {
  const dir = completionsDir()
  await fs.mkdir(dir, { recursive: true })

  const commands = Object.keys(mapping.forward)

  const bash = generateBash(serverName, commands)
  const zsh = generateZsh(serverName, commands)
  const fish = generateFish(serverName, commands)

  await fs.writeFile(path.join(dir, `${serverName}.bash`), bash, 'utf8')
  await fs.writeFile(path.join(dir, `${serverName}.zsh`), zsh, 'utf8')
  await fs.writeFile(path.join(dir, `${serverName}.fish`), fish, 'utf8')
}

export async function removeCompletions(serverName: string): Promise<void> {
  const dir = completionsDir()
  for (const ext of ['bash', 'zsh', 'fish']) {
    await fs.unlink(path.join(dir, `${serverName}.${ext}`)).catch(() => {})
  }
}

function generateBash(name: string, commands: string[]): string {
  const cmds = commands.map(c => `"${c}"`).join(' ')
  return `# bash completion for ${name}
_${name}_completion() {
  local cur words
  cur="\${COMP_WORDS[COMP_CWORD]}"
  words=(${cmds} "--capabilities" "--help" "--json" "--dry-run" "--quiet")
  COMPREPLY=($(compgen -W "\${words[*]}" -- "$cur"))
}
complete -F _${name}_completion ${name}
`
}

function generateZsh(name: string, commands: string[]): string {
  const cmds = commands.map(c => `'${c}'`).join('\n    ')
  return `#compdef ${name}
_${name}() {
  local -a cmds
  cmds=(
    ${cmds}
    '--capabilities:Show full command manifest'
    '--help:Show help'
    '--json:Output as JSON'
    '--dry-run:Preview without executing'
    '--quiet:Bare output'
  )
  _describe 'commands' cmds
}
_${name}
`
}

function generateFish(name: string, commands: string[]): string {
  return commands.map(c =>
    `complete -c ${name} -f -a '${c}' -d '${c}'`,
  ).join('\n') + '\n'
}
