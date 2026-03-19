import yargsParser from 'yargs-parser';
import { EXIT } from '../output/exit-codes.js';
import { StructuredError } from '../output/errors.js';
const META_FLAGS = new Set([
    'dry-run', 'quiet', 'q', 'json', 'idempotency-key', 'capabilities', 'debug',
]);
export function parseFlags(argv, inputSchema) {
    const properties = inputSchema.properties ?? {};
    const required = inputSchema.required ?? [];
    // Build yargs-parser config for type coercion
    const booleanFlags = [];
    const numberFlags = [];
    const arrayFlags = [];
    const stringFlags = [];
    for (const [key, prop] of Object.entries(properties)) {
        const type = prop.type;
        if (type === 'boolean')
            booleanFlags.push(key);
        else if (type === 'integer' || type === 'number')
            numberFlags.push(key);
        else if (type === 'array')
            arrayFlags.push(key);
        else
            stringFlags.push(key);
    }
    const parsed = yargsParser(argv, {
        boolean: ['dry-run', 'quiet', 'json', 'capabilities', 'debug', ...booleanFlags],
        number: numberFlags,
        array: arrayFlags,
        string: ['idempotency-key', ...stringFlags],
        alias: { q: 'quiet' },
        configuration: { 'strip-aliased': true },
    });
    const meta = {
        dryRun: Boolean(parsed['dry-run']),
        quiet: Boolean(parsed.quiet),
        json: Boolean(parsed.json),
        idempotencyKey: parsed['idempotency-key'],
        capabilities: Boolean(parsed.capabilities),
        debug: Boolean(parsed.debug),
    };
    const toolArgs = {};
    for (const key of Object.keys(properties)) {
        if (key in parsed && !META_FLAGS.has(key)) {
            let val = parsed[key];
            // Parse JSON objects
            if (properties[key]?.type === 'object' && typeof val === 'string') {
                try {
                    val = JSON.parse(val);
                }
                catch { /* leave as string */ }
            }
            // Validate enum
            if (properties[key]?.enum && !properties[key].enum.includes(val)) {
                throw new StructuredError({
                    code: 'USAGE_ERROR',
                    message: `Invalid value "${val}" for --${key}. Must be one of: ${properties[key].enum.join(', ')}`,
                    exitCode: EXIT.USAGE,
                });
            }
            toolArgs[key] = val;
        }
    }
    // Check required flags
    const missing = required.filter(r => !(r in toolArgs));
    if (missing.length > 0) {
        throw new StructuredError({
            code: 'USAGE_ERROR',
            message: `Missing required flag(s): ${missing.map(m => `--${m}`).join(', ')}`,
            exitCode: EXIT.USAGE,
            suggestions: missing.map(m => `--${m} <value>`),
        });
    }
    return { toolArgs, meta };
}
