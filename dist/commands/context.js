import { BaseCommand } from '../base-command.js';
import { SchemaCache } from '../mcp/cache.js';
import { wrapperName } from '../config/paths.js';
export default class Context extends BaseCommand {
    static description = 'Show inventory of all gashapon-managed CLIs (for AI agents)';
    static flags = {
        ...BaseCommand.baseFlags,
    };
    async run() {
        await this.parse(Context);
        const servers = await this.configManager.listServers();
        const cache = new SchemaCache();
        // Read version from package.json
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const pkg = require('../../package.json');
        const version = pkg.version;
        const clis = [];
        for (const [name, serverConfig] of Object.entries(servers)) {
            if (!serverConfig.installed)
                continue;
            const bin = wrapperName(name);
            const cached = await cache.get(name);
            const keyCommands = cached
                ? Object.keys(cached.mapping.forward).slice(0, 5)
                : [];
            clis.push({
                binary: bin,
                description: serverConfig.description ?? `MCP server: ${name}`,
                key_commands: keyCommands,
                capabilities_cmd: `${bin} --capabilities`,
            });
        }
        const tools = await this.configManager.listTools();
        const registeredClis = Object.entries(tools).map(([name, toolConfig]) => ({
            binary: name,
            description: toolConfig.description ?? `${name} CLI tool`,
            help_cmd: toolConfig.help_hint ?? `${name} --help`,
        }));
        const output = {
            managed_by: 'gashapon',
            gashapon_version: version,
            config: this.configManager.path,
            clis,
            registered_clis: registeredClis,
            hint: 'Run `<binary> --capabilities` for MCP CLIs, or `<binary> --help` for registered CLIs. All output JSON when stdout is not a TTY.',
        };
        this.outputData(output);
    }
}
