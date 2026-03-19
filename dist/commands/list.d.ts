import { BaseCommand } from '../base-command.js';
export default class List extends BaseCommand<typeof List> {
    static description: string;
    static flags: {
        installed: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        debug: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        quiet: import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
