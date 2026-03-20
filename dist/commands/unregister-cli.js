import { Args, Flags } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseCommand } from '../base-command.js';
import { resolveSkillDestinations } from '../config/paths.js';
import { buildReceipt } from '../output/receipt.js';
export default class UnregisterCli extends BaseCommand {
    static description = 'Unregister a CLI tool and remove its skill files';
    static examples = [
        '<%= config.bin %> unregister-cli jira',
        '<%= config.bin %> unregister-cli jira --target codex',
    ];
    static args = {
        name: Args.string({ description: 'CLI tool name', required: true }),
    };
    static flags = {
        ...BaseCommand.baseFlags,
        target: Flags.string({ summary: 'Skill target(s) to remove from', default: 'all', options: ['claude', 'codex', 'all'] }),
        'skills-dir': Flags.string({ summary: 'Custom skills directory to remove from (overrides --target)' }),
    };
    async run() {
        const { args, flags } = await this.parse(UnregisterCli);
        const { name } = args;
        await this.configManager.removeTool(name);
        const destinations = resolveSkillDestinations(flags.target, flags['skills-dir']);
        for (const dest of destinations) {
            await fs.rm(path.join(dest, name), { recursive: true, force: true });
        }
        this.outputData(buildReceipt('unregister-cli', name));
    }
}
