import { Args, Flags } from '@oclif/core';
import { execSync } from 'node:child_process';
import { BaseCommand } from '../base-command.js';
import { buildReceipt } from '../output/receipt.js';
export default class RegisterCli extends BaseCommand {
    static description = 'Register an existing CLI tool for skill management';
    static examples = [
        '<%= config.bin %> register-cli confluence -d "Confluence page management"',
        '<%= config.bin %> register-cli jira -d "Jira issue tracking" --help-hint "jira issue --help"',
    ];
    static args = {
        name: Args.string({ description: 'CLI binary name', required: true }),
    };
    static flags = {
        ...BaseCommand.baseFlags,
        description: Flags.string({ char: 'd', summary: 'What this tool is used for' }),
        'help-hint': Flags.string({ summary: 'Command to run for help discovery (default: <name> --help)' }),
        force: Flags.boolean({ summary: 'Overwrite if already registered', default: false }),
    };
    async run() {
        const { args, flags } = await this.parse(RegisterCli);
        const { name } = args;
        // Warn if binary not found on PATH
        try {
            execSync(`which ${name}`, { stdio: 'ignore' });
        }
        catch {
            process.stderr.write(`Warning: "${name}" not found on PATH — registering anyway\n`);
        }
        const toolConfig = {
            ...(flags.description ? { description: flags.description } : {}),
            ...(flags['help-hint'] ? { help_hint: flags['help-hint'] } : {}),
        };
        if (flags.force) {
            await this.configManager.forceAddTool(name, toolConfig);
        }
        else {
            await this.configManager.addTool(name, toolConfig);
        }
        this.outputData(buildReceipt('register-cli', name, `gashapon unregister-cli ${name}`));
    }
}
