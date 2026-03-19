import { type ExitCode } from './exit-codes.js';
export interface StructuredErrorShape {
    success: false;
    error: {
        code: string;
        message: string;
        suggestions: string[];
        retryable: boolean;
    };
}
export declare class StructuredError extends Error {
    readonly exitCode: ExitCode;
    readonly code: string;
    readonly suggestions: string[];
    readonly retryable: boolean;
    constructor(opts: {
        code: string;
        message: string;
        exitCode?: ExitCode;
        suggestions?: string[];
        retryable?: boolean;
    });
    toJSON(): StructuredErrorShape;
}
export declare function notFound(resource: string, suggestions?: string[]): StructuredError;
export declare function conflict(resource: string, suggestions?: string[]): StructuredError;
export declare function usageError(message: string, suggestions?: string[]): StructuredError;
export declare function upstreamError(message: string, retryable?: boolean): StructuredError;
export declare function timeoutError(message: string): StructuredError;
