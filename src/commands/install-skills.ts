import { Args, Flags } from '@oclif/core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { BaseCommand } from '../base-command.js'
import { SchemaCache } from '../mcp/cache.js'
import { wrapperName } from '../config/paths.js'
import { notFound } from '../output/errors.js'
import { buildReceipt } from '../output/receipt.js'

export default class InstallSkills extends BaseCommand<typeof InstallSkills> {
  static description = 'Install Claude Code skills for installed MCP servers into the current project'

  static examples = [
    '<%= config.bin %> install-skills',
    '<%= config.bin %> install-skills slack',
    '<%= config.bin %> install-skills --dest ./my-project/.claude/skills',
  ]

  static args = {
    name: Args.string({ description: 'Server name (defaults to all installed servers)', required: false }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    dest: Flags.string({
      summary: 'Destination skills directory',
      default: '.claude/skills',
    }),
    force: Flags.boolean({
      summary: 'Overwrite existing skill files',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(InstallSkills)

    const servers = await this.configManager.listServers()
    const names: string[] = []

    if (args.name) {
      if (!servers[args.name]) throw notFound(`Server "${args.name}"`, ['Run `gashapon list` to see available servers'])
      names.push(args.name)
    } else {
      for (const [name, config] of Object.entries(servers)) {
        if (config.installed) names.push(name)
      }
    }

    const cache = new SchemaCache()
    const installed: string[] = []

    for (const name of names) {
      const cached = await cache.get(name)
      const skillContent = buildSkillContent(name, servers[name].description, cached?.tools ?? [])
      const skillDir = path.join(flags.dest, wrapperName(name))
      const skillPath = path.join(skillDir, 'SKILL.md')

      let exists = false
      try {
        await fs.access(skillPath)
        exists = true
      } catch { /* doesn't exist */ }

      if (exists && !flags.force) {
        process.stderr.write(`Skill for "${name}" already exists at ${skillPath} (use --force to overwrite)\n`)
        continue
      }

      await fs.mkdir(skillDir, { recursive: true })
      await fs.writeFile(skillPath, skillContent, 'utf8')
      process.stderr.write(`Wrote skill: ${skillPath}\n`)
      installed.push(wrapperName(name))
    }

    this.outputData(buildReceipt('install-skills', installed.join(', ') || '(none)'))
  }
}

function buildSkillContent(serverName: string, description: string | undefined, tools: { name: string; description?: string }[]): string {
  const binName = wrapperName(serverName)
  const desc = description ?? `${serverName} MCP server`

  const toolLines = tools.map(t => {
    const summary = t.description?.split('\n')[0].slice(0, 100) ?? ''
    return `- \`${binName} ${t.name.replaceAll('_', ' ')}\`: ${summary}`
  }).join('\n')

  return `---
name: ${binName}
description: Use ${binName} to interact with ${desc}. Invoke this skill when the user asks about ${serverName}.
---

# ${binName}

\`${binName}\` is a CLI tool that wraps the **${serverName}** MCP server. Use it when the user asks you to interact with ${serverName}.

## When to use

Use \`${binName}\` when the user asks you to read, search, send, or otherwise interact with ${serverName}.

## Available commands

${toolLines || `Run \`${binName} --help\` to see available commands.`}

## Usage

\`\`\`sh
${binName} <command> [flags]
${binName} --help
\`\`\`
`
}
