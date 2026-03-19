import { Command, Flags } from '@oclif/core';
import { ConfigManager } from './config/manager.js';
import { StructuredError } from './output/errors.js';
import { EXIT } from './output/exit-codes.js';
export class BaseCommand extends Command {
    static baseFlags = {
        debug: Flags.boolean({
            helpGroup: 'GLOBAL',
            summary: 'Enable debug output (raw JSON-RPC, stack traces)',
            default: false,
        }),
        quiet: Flags.boolean({
            char: 'q',
            helpGroup: 'GLOBAL',
            summary: 'Output bare values only',
            default: false,
        }),
    };
    static enableJsonFlag = true;
    flags;
    _configManager;
    get configManager() {
        this._configManager ??= new ConfigManager();
        return this._configManager;
    }
    isJson() {
        return this.jsonEnabled();
    }
    isQuiet() {
        return this.flags.quiet ?? false;
    }
    /**
     * Output data respecting --json, --quiet, and TTY detection.
     * --json always wins and guarantees machine-readable output.
     * --quiet (without --json) prints bare values.
     * JSON goes to stdout; decorative text to stderr.
     */
    outputData(data) {
        if (this.isJson()) {
            process.stdout.write(JSON.stringify(data, null, 2) + '\n');
        }
        else if (this.isQuiet()) {
            this.logBare(data);
        }
        else {
            process.stdout.write(JSON.stringify(data, null, 2) + '\n');
        }
    }
    logBare(data) {
        if (Array.isArray(data)) {
            for (const item of data)
                process.stdout.write(String(item) + '\n');
        }
        else if (data !== null && typeof data === 'object') {
            const vals = Object.values(data);
            if (vals.length === 1) {
                process.stdout.write(String(vals[0]) + '\n');
            }
            else {
                process.stdout.write(JSON.stringify(data) + '\n');
            }
        }
        else {
            process.stdout.write(String(data) + '\n');
        }
    }
    outputError(err) {
        process.stdout.write(JSON.stringify(err.toJSON(), null, 2) + '\n');
    }
    async init() {
        await super.init();
        const { flags } = await this.parse({
            flags: this.ctor.flags,
            baseFlags: super.ctor.baseFlags,
            enableJsonFlag: this.ctor.enableJsonFlag,
            args: this.ctor.args,
            strict: this.ctor.strict,
        });
        this.flags = flags;
    }
    async catch(err) {
        if (err instanceof StructuredError) {
            this.outputError(err);
            process.exit(err.exitCode);
        }
        const debugMode = this.flags?.debug;
        if (debugMode || process.env.GASHAPON_DEBUG) {
            process.stderr.write(err.stack ?? err.message);
            process.stderr.write('\n');
        }
        const structured = new StructuredError({
            code: 'INTERNAL_ERROR',
            message: err.message,
            exitCode: EXIT.FAILURE,
        });
        this.outputError(structured);
        process.exit(EXIT.FAILURE);
    }
}
