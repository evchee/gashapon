import { BaseCommand } from '../base-command.js';
export default class Add extends BaseCommand<typeof Add> {
    static description: string;
    static examples: string[];
    static strict: boolean;
    static args: {
        name: import("@oclif/core/interfaces").Arg<string, Record<string, unknown>>;
    };
    static flags: {
        transport: import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        command: import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        args: import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        env: import("@oclif/core/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/interfaces").CustomOptions>;
        url: import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        header: import("@oclif/core/interfaces").OptionFlag<string[] | undefined, import("@oclif/core/interfaces").CustomOptions>;
        description: import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        force: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        'from-json-b64': import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        oauth: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        'oauth-client-id': import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        'oauth-client-secret': import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        'oauth-scope': import("@oclif/core/interfaces").OptionFlag<string | undefined, import("@oclif/core/interfaces").CustomOptions>;
        'oauth-grant-type': import("@oclif/core/interfaces").OptionFlag<string, import("@oclif/core/interfaces").CustomOptions>;
        debug: import("@oclif/core/interfaces").BooleanFlag<boolean>;
        quiet: import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
}
