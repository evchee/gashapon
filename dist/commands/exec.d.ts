import { Command } from '@oclif/core';
export default class Exec extends Command {
    static description: string;
    static hidden: boolean;
    static strict: boolean;
    static enableJsonFlag: boolean;
    static args: {};
    static flags: {};
    init(): Promise<void>;
    run(): Promise<void>;
}
