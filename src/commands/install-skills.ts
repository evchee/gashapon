import { Args, Flags } from '@oclif/core'
import fs from 'node:fs/promises'
import path from 'node:path'
import { BaseCommand } from '../base-command.js'
import { wrapperName, resolveSkillDestinations } from '../config/paths.js'
import { notFound } from '../output/errors.js'
import { buildReceipt } from '../output/receipt.js'

export default class InstallSkills extends BaseCommand<typeof InstallSkills> {
  static description = 'Install skill files for MCP servers and registered CLI tools (Claude Code and Codex CLI)'

  static examples = [
    '<%= config.bin %> install-skills',
    '<%= config.bin %> install-skills slack',
    '<%= config.bin %> install-skills --target codex',
    '<%= config.bin %> install-skills --target claude',
    '<%= config.bin %> install-skills --dest ./my-project/.claude/skills',
  ]

  static args = {
    name: Args.string({ description: 'Server or tool name (defaults to all)', required: false }),
  }

  static flags = {
    ...BaseCommand.baseFlags,
    target: Flags.string({
      summary: 'Skill target(s) to write to',
      default: 'all',
      options: ['claude', 'codex', 'all'],
    }),
    dest: Flags.string({
      summary: 'Custom destination directory (overrides --target)',
    }),
    force: Flags.boolean({
      summary: 'Overwrite existing skill files',
      default: false,
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(InstallSkills)

    const servers = await this.configManager.listServers()
    const tools = await this.configManager.listTools()
    const installed: string[] = []
    const destinations = resolveSkillDestinations(flags.target, flags.dest)

    // MCP servers
    const serverNames = args.name
      ? (servers[args.name] ? [args.name] : [])
      : Object.keys(servers).filter(n => servers[n].installed)

    if (args.name && !servers[args.name] && !tools[args.name]) {
      throw notFound(`"${args.name}"`, ['Run `gashapon list` to see available servers and tools'])
    }

    for (const name of serverNames) {
      const content = buildMcpSkillContent(name, servers[name].description)
      for (const dest of destinations) {
        const skillPath = path.join(dest, wrapperName(name), 'SKILL.md')
        if (!flags.force && await fileExists(skillPath)) {
          process.stderr.write(`Skill for "${name}" already exists at ${skillPath} (use --force to overwrite)\n`)
          continue
        }
        await writeSkill(skillPath, content)
      }
      installed.push(wrapperName(name))
    }

    // Registered CLI tools
    const toolNames = args.name
      ? (tools[args.name] ? [args.name] : [])
      : Object.keys(tools)

    for (const name of toolNames) {
      const { description, help_hint } = tools[name]
      const content = buildToolSkillContent(name, description, help_hint)
      for (const dest of destinations) {
        const skillPath = path.join(dest, name, 'SKILL.md')
        if (!flags.force && await fileExists(skillPath)) {
          process.stderr.write(`Skill for "${name}" already exists at ${skillPath} (use --force to overwrite)\n`)
          continue
        }
        await writeSkill(skillPath, content)
      }
      installed.push(name)
    }

    this.outputData(buildReceipt('install-skills', installed.join(', ') || '(none)'))
  }
}

async function fileExists(p: string): Promise<boolean> {
  try { await fs.access(p); return true } catch { return false }
}

async function writeSkill(skillPath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(skillPath), { recursive: true })
  await fs.writeFile(skillPath, content, 'utf8')
  process.stderr.write(`Wrote skill: ${skillPath}\n`)
}

/** Safely encode a string as a double-quoted YAML scalar value. */
function yamlQuote(s: string): string {
  const sanitized = s.replace(/\n/g, ' ').replace(/\r/g, '')
  return '"' + sanitized.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
}

function buildMcpSkillContent(serverName: string, description: string | undefined): string {
  const binName = wrapperName(serverName)
  const desc = description ?? `${serverName} MCP server`
  return `---
name: ${binName}
description: ${yamlQuote(desc)}
---

\`${binName}\` is available for interacting with ${serverName}.

## Discovery

Run \`${binName} --capabilities\` to get a full JSON manifest of all commands and their flags (required/optional, types, descriptions). This is the fastest way to know what flags to pass.

Run \`${binName} <command> --help\` (e.g. \`${binName} channels list --help\`) for a per-command flag reference.

## Invocation styles

Both styles are equivalent:

\`\`\`
${binName} <command> --flag_name value --other_flag value
${binName} <command> '{"flag_name": "value", "other_flag": "value"}'
\`\`\`

Flag names match the schema exactly (e.g. \`--channel_id\`, not \`--channel-id\`).

## Error handling

Errors are JSON on stdout with \`success: false\` and an \`error.suggestions\` array listing available flags — use suggestions to self-correct without needing an extra discovery call.
`
}

function buildToolSkillContent(name: string, description: string | undefined, helpHint: string | undefined): string {
  const desc = description ?? `${name} CLI tool`
  const hint = helpHint ?? `${name} --help`
  return `---
name: ${name}
description: ${yamlQuote(desc)}
---

\`${name}\` is available on this machine. Run \`${hint}\` to discover available commands.
`
}
