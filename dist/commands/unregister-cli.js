import { Args, Flags } from '@oclif/core';
import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseCommand } from '../base-command.js';
import { buildReceipt } from '../output/receipt.js';
export default class UnregisterCli extends BaseCommand {
    static description = 'Unregister a CLI tool and remove its skill file';
    static examples = [
        '<%= config.bin %> unregister-cli jira',
    ];
    static args = {
        name: Args.string({ description: 'CLI tool name', required: true }),
    };
    static flags = {
        ...BaseCommand.baseFlags,
        'skills-dir': Flags.string({ summary: 'Skills directory to remove skill from', default: '.claude/skills' }),
    };
    async run() {
        const { args, flags } = await this.parse(UnregisterCli);
        const { name } = args;
        await this.configManager.removeTool(name);
        // Remove skill file if present
        const skillPath = path.join(flags['skills-dir'], name, 'SKILL.md');
        await fs.rm(path.dirname(skillPath), { recursive: true, force: true });
        this.outputData(buildReceipt('unregister-cli', name));
    }
}
