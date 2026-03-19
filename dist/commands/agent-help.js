import { BaseCommand } from '../base-command.js';
import { configPath, binDir } from '../config/paths.js';
import { wrapperName } from '../config/paths.js';
export default class AgentHelp extends BaseCommand {
    static description = 'Print guidance for AI agents on how to use and configure gashapon';
    static examples = [
        '<%= config.bin %> agent-help',
    ];
    static flags = {
        ...BaseCommand.baseFlags,
    };
    async run() {
        const config = await this.configManager.load();
        const bd = binDir(config);
        const cfgPath = configPath();
        const serverEntries = Object.entries(config.servers);
        const toolEntries = Object.entries(config.tools);
        const lines = [
            '# gashapon agent guide',
            '',
            'gashapon manages MCP server CLI wrappers and registered CLI tools.',
            'It generates executable wrappers and skill files for Claude Code and Codex CLI.',
            '',
            '## Config file',
            '',
            `Path: ${cfgPath}`,
            '',
            '```json',
            JSON.stringify({
                version: '1',
                bin_dir: '~/.gashapon/bin',
                servers: {
                    '<name>': {
                        transport: 'stdio | http',
                        '(stdio)': { command: '<binary>', args: ['...'], env: {} },
                        '(http)': { url: 'https://...', headers: {}, oauth: { grant_type: 'authorization_code', client_id: '...', callback_port: 3000 } },
                        installed: false,
                        description: 'optional',
                    },
                },
                tools: {
                    '<name>': {
                        description: 'optional — what the tool does',
                        help_hint: 'optional — e.g. "jira issue --help"',
                    },
                },
            }, null, 2),
            '```',
            '',
            '## Key commands',
            '',
            '### MCP servers',
            '```sh',
            'gashapon add <name> -- <command> [args]          # register stdio server',
            'gashapon add <name> --url <url> [--oauth ...]    # register http server',
            'gashapon add slack                               # register well-known server (auto-configured)',
            'gashapon auth <name>                             # OAuth login for http server',
            'gashapon install <name>                          # connect, discover tools, write wrapper binary',
            'gashapon uninstall <name>                        # remove wrapper binary',
            'gashapon remove <name>                           # remove from config',
            'gashapon list                                    # list all configured servers',
            '```',
            '',
            '### CLI tools',
            '```sh',
            'gashapon register-cli <name> [-d "desc"] [--help-hint "cmd --help"]',
            'gashapon unregister-cli <name>',
            '```',
            '',
            '### Skills & PATH',
            '```sh',
            'gashapon install-skills                          # write skills to .claude/skills/ + .agents/skills/',
            'gashapon install-skills --target codex           # Codex CLI only',
            'gashapon install-skills <name>                  # single server or tool',
            'gashapon init                                    # add bin dir to shell PATH',
            '```',
            '',
            '### Execution',
            '```sh',
            'gashapon exec <server> <command> [flags]         # invoke an MCP tool directly',
            '<server>_capsule <command> [flags]               # same, via generated wrapper',
            '<server>_capsule --help                          # list available commands',
            '```',
            '',
            '## Generated wrapper location',
            '',
            `Bin dir: ${bd}`,
            `Wrappers are named \`<server>_capsule\` (e.g. slack → \`${wrapperName('slack')}\`).`,
            `Add to PATH: export PATH="${bd}:$PATH"`,
        ];
        if (serverEntries.length > 0) {
            lines.push('', '## Currently configured servers', '');
            for (const [name, s] of serverEntries) {
                const status = s.installed ? '✓ installed' : '✗ not installed';
                lines.push(`- **${name}** (${s.transport}) — ${status}${s.description ? ` — ${s.description}` : ''}`);
                if (s.installed)
                    lines.push(`  wrapper: \`${wrapperName(name)}\``);
            }
        }
        if (toolEntries.length > 0) {
            lines.push('', '## Currently registered CLI tools', '');
            for (const [name, t] of toolEntries) {
                const hint = t.help_hint ?? `${name} --help`;
                lines.push(`- **${name}**${t.description ? ` — ${t.description}` : ''} (help: \`${hint}\`)`);
            }
        }
        process.stdout.write(lines.join('\n') + '\n');
    }
}
