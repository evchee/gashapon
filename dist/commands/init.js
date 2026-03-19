import { Flags } from '@oclif/core';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseCommand } from '../base-command.js';
import { binDir } from '../config/paths.js';
const MARKER = '# gashapon PATH';
/** Detect the user's login shell config file. */
function shellConfigFile() {
    const shell = process.env.SHELL ?? '';
    if (shell.endsWith('zsh'))
        return path.join(os.homedir(), '.zshrc');
    if (shell.endsWith('fish'))
        return path.join(os.homedir(), '.config', 'fish', 'config.fish');
    return path.join(os.homedir(), '.bashrc');
}
export default class Init extends BaseCommand {
    static description = 'Add gashapon bin directory to PATH in your shell config';
    static examples = [
        '<%= config.bin %> init',
        '<%= config.bin %> init --print',
    ];
    static flags = {
        ...BaseCommand.baseFlags,
        print: Flags.boolean({
            summary: 'Print the export line instead of writing to shell config',
            default: false,
        }),
    };
    async run() {
        const { flags } = await this.parse(Init);
        const config = await this.configManager.load();
        const bd = binDir(config);
        const exportLine = `export PATH="${bd}:$PATH"  ${MARKER}`;
        if (flags.print) {
            process.stdout.write(exportLine + '\n');
            return;
        }
        const configFile = shellConfigFile();
        let contents = '';
        try {
            contents = await fs.readFile(configFile, 'utf8');
        }
        catch { /* file may not exist yet */ }
        if (contents.includes(MARKER)) {
            process.stderr.write(`gashapon PATH already present in ${configFile}\n`);
            process.stderr.write(`Restart your shell or run: source ${configFile}\n`);
            return;
        }
        await fs.appendFile(configFile, `\n${exportLine}\n`);
        process.stderr.write(`Added to ${configFile}:\n  ${exportLine}\n`);
        process.stderr.write(`Restart your shell or run: source ${configFile}\n`);
    }
}
