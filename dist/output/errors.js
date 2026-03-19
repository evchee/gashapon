import { EXIT } from './exit-codes.js';
export class StructuredError extends Error {
    exitCode;
    code;
    suggestions;
    retryable;
    constructor(opts) {
        super(opts.message);
        this.code = opts.code;
        this.exitCode = opts.exitCode ?? EXIT.FAILURE;
        this.suggestions = opts.suggestions ?? [];
        this.retryable = opts.retryable ?? false;
    }
    toJSON() {
        return {
            success: false,
            error: {
                code: this.code,
                message: this.message,
                suggestions: this.suggestions,
                retryable: this.retryable,
            },
        };
    }
}
export function notFound(resource, suggestions = []) {
    return new StructuredError({
        code: 'NOT_FOUND',
        message: `${resource} not found`,
        exitCode: EXIT.NOT_FOUND,
        suggestions,
    });
}
export function conflict(resource, suggestions = []) {
    return new StructuredError({
        code: 'CONFLICT',
        message: `${resource} already exists`,
        exitCode: EXIT.CONFLICT,
        suggestions,
    });
}
export function usageError(message, suggestions = []) {
    return new StructuredError({
        code: 'USAGE_ERROR',
        message,
        exitCode: EXIT.USAGE,
        suggestions,
    });
}
export function upstreamError(message, retryable = true) {
    return new StructuredError({
        code: 'UPSTREAM_ERROR',
        message,
        exitCode: EXIT.UPSTREAM,
        retryable,
    });
}
export function timeoutError(message) {
    return new StructuredError({
        code: 'TIMEOUT',
        message,
        exitCode: EXIT.TIMEOUT,
        retryable: true,
    });
}
