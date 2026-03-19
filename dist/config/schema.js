import { z } from 'zod';
const SERVER_NAME_REGEX = /^[a-z0-9][a-z0-9_-]*$/;
export const ServerNameSchema = z
    .string()
    .min(1)
    .regex(SERVER_NAME_REGEX, 'Server name must match /^[a-z0-9][a-z0-9_-]*$/');
export const StdioServerConfigSchema = z.object({
    transport: z.literal('stdio'),
    command: z.string().min(1),
    args: z.array(z.string()).optional().default([]),
    env: z.record(z.string()).optional().default({}),
    installed: z.boolean().default(false),
    description: z.string().optional(),
});
export const OAuthConfigSchema = z.object({
    grant_type: z.enum(['authorization_code', 'client_credentials']).default('authorization_code'),
    client_id: z.string().optional(),
    client_secret: z.string().optional(),
    scope: z.string().optional(),
    callback_port: z.number().int().min(1).max(65535).optional(),
});
export const HttpServerConfigSchema = z.object({
    transport: z.literal('http'),
    url: z.string().url(),
    headers: z.record(z.string()).optional().default({}),
    oauth: OAuthConfigSchema.optional(),
    installed: z.boolean().default(false),
    description: z.string().optional(),
});
export const ServerConfigSchema = z.discriminatedUnion('transport', [
    StdioServerConfigSchema,
    HttpServerConfigSchema,
]);
export const ToolConfigSchema = z.object({
    description: z.string().optional(),
    help_hint: z.string().optional(),
});
export const GashaponConfigSchema = z.object({
    version: z.literal('1'),
    bin_dir: z.string().default('~/.gashapon/bin'),
    servers: z.record(ServerNameSchema, ServerConfigSchema).default({}),
    tools: z.record(ServerNameSchema, ToolConfigSchema).default({}),
});
export const DEFAULT_CONFIG = {
    version: '1',
    bin_dir: '~/.gashapon/bin',
    servers: {},
    tools: {},
};
