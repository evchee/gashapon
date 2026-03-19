import { BaseCommand } from '../base-command.js';
export default class Context extends BaseCommand<typeof Context> {
    static description: string;
    static flags: {
        debug: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        quiet: import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
