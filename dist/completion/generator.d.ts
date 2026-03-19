import type { NounVerbMapping } from '../runtime/mapping.js';
export declare function generateCompletions(serverName: string, mapping: NounVerbMapping): Promise<void>;
export declare function removeCompletions(serverName: string): Promise<void>;
