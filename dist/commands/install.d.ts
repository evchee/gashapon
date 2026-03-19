import { BaseCommand } from '../base-command.js';
export default class Install extends BaseCommand<typeof Install> {
    static description: string;
    static args: {
        name: import("@oclif/core/interfaces").Arg<string, Record<string, unknown>>;
    };
    static flags: {
        force: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        debug: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        quiet: import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
