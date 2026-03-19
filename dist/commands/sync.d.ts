import { BaseCommand } from '../base-command.js';
export default class Sync extends BaseCommand<typeof Sync> {
    static description: string;
    static args: {
        name: import("@oclif/core/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        all: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        debug: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        quiet: import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
