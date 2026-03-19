import { Command, Interfaces } from '@oclif/core';
import { ConfigManager } from './config/manager.js';
import { StructuredError } from './output/errors.js';
export type BaseFlags<T extends typeof Command> = Interfaces.InferredFlags<typeof BaseCommand.baseFlags & T['flags']>;
export declare abstract class BaseCommand<T extends typeof Command> extends Command {
    static baseFlags: {
        debug: Interfaces.BooleanFlag<boolean>;
        quiet: Interfaces.BooleanFlag<boolean>;
    };
    static enableJsonFlag: boolean;
    protected flags: BaseFlags<T>;
    private _configManager?;
    protected get configManager(): ConfigManager;
    protected isJson(): boolean;
    protected isQuiet(): boolean;
    /**
     * Output data respecting --json, --quiet, and TTY detection.
     * JSON goes to stdout; decorative text to stderr.
     */
    protected outputData(data: unknown): void;
    private logBare;
    protected outputError(err: StructuredError): void;
    init(): Promise<void>;
    protected catch(err: Error & {
        exitCode?: number;
    }): Promise<unknown>;
}
