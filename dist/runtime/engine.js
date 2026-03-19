import { buildMapping } from './mapping.js';
import { parseFlags } from './flags.js';
import { OutputFormatter } from './formatter.js';
import { MCPClientWrapper } from '../mcp/client.js';
import { EXIT } from '../output/exit-codes.js';
import { StructuredError, notFound, upstreamError } from '../output/errors.js';
export class ExecutionEngine {
    configManager;
    cache;
    formatter = new OutputFormatter();
    constructor(configManager, cache) {
        this.configManager = configManager;
        this.cache = cache;
    }
    async execute(serverName, argv) {
        const serverConfig = await this.configManager.getServer(serverName);
        if (!serverConfig) {
            const err = notFound(`Server "${serverName}"`, ['Run `gashapon list` to see available servers']);
            process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
            process.exit(EXIT.NOT_FOUND);
        }
        // Load or auto-sync cache
        let cached = await this.cache.get(serverName);
        if (!cached) {
            process.stderr.write(`Cache miss for "${serverName}", auto-syncing...\n`);
            const client = new MCPClientWrapper(serverName, serverConfig);
            await client.connect();
            const tools = await client.listTools();
            await client.close();
            const mapping = buildMapping(tools);
            cached = { version: '1', timestamp: new Date().toISOString(), tools, mapping };
            await this.cache.set(serverName, cached);
        }
        const { mapping, tools } = cached;
        // Short-circuit: --capabilities
        if (argv.includes('--capabilities')) {
            this.outputCapabilities(serverName, mapping, tools);
            return;
        }
        // Short-circuit: schema <command>
        if (argv[0] === 'schema') {
            this.outputSchema(argv.slice(1), mapping, tools);
            return;
        }
        // Short-circuit: --help or no args
        if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
            this.outputHelp(serverName, mapping);
            return;
        }
        // Resolve noun-verb command
        const { toolName, remainingArgv } = this.resolveCommand(argv, mapping);
        if (!toolName) {
            const err = new StructuredError({
                code: 'COMMAND_NOT_FOUND',
                message: `Unknown command: ${argv.slice(0, 2).join(' ')}`,
                exitCode: EXIT.NOT_FOUND,
                suggestions: [`Run \`${serverName} --help\` to see available commands`],
            });
            process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
            process.exit(EXIT.NOT_FOUND);
        }
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
            const err = notFound(`Tool "${toolName}"`);
            process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
            process.exit(EXIT.NOT_FOUND);
        }
        const toolInfo = this.findToolInfo(toolName, mapping);
        // Parse flags against schema
        let parsed;
        try {
            parsed = parseFlags(remainingArgv, tool.inputSchema);
        }
        catch (err) {
            if (err instanceof StructuredError) {
                process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
                process.exit(err.exitCode);
            }
            throw err;
        }
        const { meta, toolArgs } = parsed;
        // Handle --dry-run
        if (meta.dryRun) {
            const dryResult = {
                dry_run: true,
                would_execute: {
                    server: serverName,
                    tool: toolName,
                    arguments: toolArgs,
                    destructive: toolInfo?.annotations?.destructiveHint ?? false,
                },
            };
            process.stdout.write(JSON.stringify(dryResult, null, 2) + '\n');
            return;
        }
        // Connect and call
        const client = new MCPClientWrapper(serverName, serverConfig);
        try {
            await client.connect();
        }
        catch (err) {
            if (err instanceof StructuredError) {
                process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
                process.exit(err.exitCode);
            }
            const structured = upstreamError(err.message);
            process.stdout.write(JSON.stringify(structured.toJSON(), null, 2) + '\n');
            process.exit(EXIT.UPSTREAM);
        }
        try {
            const result = await client.callTool(toolName, toolArgs, {
                idempotencyKey: meta.idempotencyKey,
            });
            this.formatter.format(result, toolInfo ?? { mcpName: toolName, inputSchema: {} }, {
                quiet: meta.quiet,
                json: meta.json,
                serverName,
                toolName,
            });
            process.exit(result.isError ? EXIT.FAILURE : EXIT.SUCCESS);
        }
        finally {
            await client.close();
        }
    }
    resolveCommand(argv, mapping) {
        // Skip flags at start when resolving command
        const nonFlagArgv = argv.filter(a => !a.startsWith('-'));
        // Try 2-token: "noun verb"
        if (nonFlagArgv.length >= 2) {
            const twoToken = `${nonFlagArgv[0]} ${nonFlagArgv[1]}`;
            if (mapping.forward[twoToken]) {
                // Remove the two command tokens from argv
                const remaining = this.removeTokens(argv, [nonFlagArgv[0], nonFlagArgv[1]]);
                return { toolName: mapping.forward[twoToken], remainingArgv: remaining };
            }
        }
        // Try 1-token
        if (nonFlagArgv.length >= 1) {
            const oneToken = nonFlagArgv[0];
            if (mapping.forward[oneToken]) {
                const remaining = this.removeTokens(argv, [oneToken]);
                return { toolName: mapping.forward[oneToken], remainingArgv: remaining };
            }
        }
        return { toolName: null, remainingArgv: argv };
    }
    removeTokens(argv, tokens) {
        const result = [...argv];
        for (const token of tokens) {
            const idx = result.findIndex(a => a === token && !a.startsWith('-'));
            if (idx !== -1)
                result.splice(idx, 1);
        }
        return result;
    }
    findToolInfo(toolName, mapping) {
        for (const noun of Object.values(mapping.tree)) {
            for (const info of Object.values(noun)) {
                if (info.mcpName === toolName)
                    return info;
            }
        }
        return undefined;
    }
    outputCapabilities(serverName, mapping, tools) {
        const commands = {};
        for (const tool of tools) {
            const cliKey = mapping.reverse[tool.name] ?? tool.name;
            const ann = tool.annotations;
            commands[cliKey] = {
                destructive: ann?.destructiveHint ?? false,
                dry_run: true,
                idempotent: ann?.idempotentHint ?? (ann?.destructiveHint === true ? false : true),
            };
        }
        const manifest = {
            name: serverName,
            version: '0.1.0',
            commands,
        };
        process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
    }
    outputSchema(schemaArgv, mapping, tools) {
        // Resolve command name from remaining argv
        const cmd = schemaArgv.filter(a => !a.startsWith('-'));
        let toolName = null;
        if (cmd.length >= 2) {
            const twoToken = `${cmd[0]} ${cmd[1]}`;
            if (mapping.forward[twoToken])
                toolName = mapping.forward[twoToken];
        }
        if (!toolName && cmd.length >= 1 && mapping.forward[cmd[0]]) {
            toolName = mapping.forward[cmd[0]];
        }
        if (!toolName) {
            process.stdout.write(JSON.stringify({ error: 'Command not found' }) + '\n');
            process.exit(EXIT.NOT_FOUND);
        }
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
            process.stdout.write(JSON.stringify({ error: 'Tool not found' }) + '\n');
            process.exit(EXIT.NOT_FOUND);
        }
        const result = {
            command: mapping.reverse[toolName] ?? toolName,
            mcp_tool: toolName,
            input_schema: tool.inputSchema,
            output_schema: tool.outputSchema ?? null,
            annotations: tool.annotations ?? null,
        };
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    }
    outputHelp(serverName, mapping) {
        const lines = [`Usage: ${serverName} <command> [flags]`, '', 'Commands:'];
        for (const [noun, verbs] of Object.entries(mapping.tree)) {
            if (noun === '_root') {
                for (const [verb, info] of Object.entries(verbs)) {
                    lines.push(`  ${verb.padEnd(30)} ${info.description ?? ''}`);
                }
            }
            else {
                for (const [verb, info] of Object.entries(verbs)) {
                    lines.push(`  ${noun} ${verb.padEnd(28)} ${info.description ?? ''}`);
                }
            }
        }
        lines.push('', 'Global flags:', '  --capabilities   Show full command manifest', '  --json           Output as JSON', '  --dry-run        Preview without executing', '  --quiet, -q      Bare output');
        process.stderr.write(lines.join('\n') + '\n');
    }
}
