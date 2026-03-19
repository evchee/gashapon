import { z } from 'zod';
export declare const ServerNameSchema: z.ZodString;
export declare const StdioServerConfigSchema: z.ZodObject<{
    transport: z.ZodLiteral<"stdio">;
    command: z.ZodString;
    args: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    env: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    installed: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transport: "stdio";
    command: string;
    args: string[];
    env: Record<string, string>;
    installed: boolean;
    description?: string | undefined;
}, {
    transport: "stdio";
    command: string;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    installed?: boolean | undefined;
    description?: string | undefined;
}>;
export declare const OAuthConfigSchema: z.ZodObject<{
    grant_type: z.ZodDefault<z.ZodEnum<["authorization_code", "client_credentials"]>>;
    client_id: z.ZodOptional<z.ZodString>;
    client_secret: z.ZodOptional<z.ZodString>;
    scope: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    grant_type: "authorization_code" | "client_credentials";
    client_id?: string | undefined;
    client_secret?: string | undefined;
    scope?: string | undefined;
}, {
    grant_type?: "authorization_code" | "client_credentials" | undefined;
    client_id?: string | undefined;
    client_secret?: string | undefined;
    scope?: string | undefined;
}>;
export declare const HttpServerConfigSchema: z.ZodObject<{
    transport: z.ZodLiteral<"http">;
    url: z.ZodString;
    headers: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    oauth: z.ZodOptional<z.ZodObject<{
        grant_type: z.ZodDefault<z.ZodEnum<["authorization_code", "client_credentials"]>>;
        client_id: z.ZodOptional<z.ZodString>;
        client_secret: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        grant_type: "authorization_code" | "client_credentials";
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    }, {
        grant_type?: "authorization_code" | "client_credentials" | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    }>>;
    installed: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transport: "http";
    installed: boolean;
    url: string;
    headers: Record<string, string>;
    description?: string | undefined;
    oauth?: {
        grant_type: "authorization_code" | "client_credentials";
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    } | undefined;
}, {
    transport: "http";
    url: string;
    installed?: boolean | undefined;
    description?: string | undefined;
    headers?: Record<string, string> | undefined;
    oauth?: {
        grant_type?: "authorization_code" | "client_credentials" | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    } | undefined;
}>;
export declare const ServerConfigSchema: z.ZodDiscriminatedUnion<"transport", [z.ZodObject<{
    transport: z.ZodLiteral<"stdio">;
    command: z.ZodString;
    args: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    env: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    installed: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transport: "stdio";
    command: string;
    args: string[];
    env: Record<string, string>;
    installed: boolean;
    description?: string | undefined;
}, {
    transport: "stdio";
    command: string;
    args?: string[] | undefined;
    env?: Record<string, string> | undefined;
    installed?: boolean | undefined;
    description?: string | undefined;
}>, z.ZodObject<{
    transport: z.ZodLiteral<"http">;
    url: z.ZodString;
    headers: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
    oauth: z.ZodOptional<z.ZodObject<{
        grant_type: z.ZodDefault<z.ZodEnum<["authorization_code", "client_credentials"]>>;
        client_id: z.ZodOptional<z.ZodString>;
        client_secret: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        grant_type: "authorization_code" | "client_credentials";
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    }, {
        grant_type?: "authorization_code" | "client_credentials" | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    }>>;
    installed: z.ZodDefault<z.ZodBoolean>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    transport: "http";
    installed: boolean;
    url: string;
    headers: Record<string, string>;
    description?: string | undefined;
    oauth?: {
        grant_type: "authorization_code" | "client_credentials";
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    } | undefined;
}, {
    transport: "http";
    url: string;
    installed?: boolean | undefined;
    description?: string | undefined;
    headers?: Record<string, string> | undefined;
    oauth?: {
        grant_type?: "authorization_code" | "client_credentials" | undefined;
        client_id?: string | undefined;
        client_secret?: string | undefined;
        scope?: string | undefined;
    } | undefined;
}>]>;
export declare const GashaponConfigSchema: z.ZodObject<{
    version: z.ZodLiteral<"1">;
    bin_dir: z.ZodDefault<z.ZodString>;
    servers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodDiscriminatedUnion<"transport", [z.ZodObject<{
        transport: z.ZodLiteral<"stdio">;
        command: z.ZodString;
        args: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        env: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
        installed: z.ZodDefault<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        transport: "stdio";
        command: string;
        args: string[];
        env: Record<string, string>;
        installed: boolean;
        description?: string | undefined;
    }, {
        transport: "stdio";
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        installed?: boolean | undefined;
        description?: string | undefined;
    }>, z.ZodObject<{
        transport: z.ZodLiteral<"http">;
        url: z.ZodString;
        headers: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>>;
        oauth: z.ZodOptional<z.ZodObject<{
            grant_type: z.ZodDefault<z.ZodEnum<["authorization_code", "client_credentials"]>>;
            client_id: z.ZodOptional<z.ZodString>;
            client_secret: z.ZodOptional<z.ZodString>;
            scope: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            grant_type: "authorization_code" | "client_credentials";
            client_id?: string | undefined;
            client_secret?: string | undefined;
            scope?: string | undefined;
        }, {
            grant_type?: "authorization_code" | "client_credentials" | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            scope?: string | undefined;
        }>>;
        installed: z.ZodDefault<z.ZodBoolean>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        transport: "http";
        installed: boolean;
        url: string;
        headers: Record<string, string>;
        description?: string | undefined;
        oauth?: {
            grant_type: "authorization_code" | "client_credentials";
            client_id?: string | undefined;
            client_secret?: string | undefined;
            scope?: string | undefined;
        } | undefined;
    }, {
        transport: "http";
        url: string;
        installed?: boolean | undefined;
        description?: string | undefined;
        headers?: Record<string, string> | undefined;
        oauth?: {
            grant_type?: "authorization_code" | "client_credentials" | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            scope?: string | undefined;
        } | undefined;
    }>]>>>;
}, "strip", z.ZodTypeAny, {
    version: "1";
    bin_dir: string;
    servers: Record<string, {
        transport: "stdio";
        command: string;
        args: string[];
        env: Record<string, string>;
        installed: boolean;
        description?: string | undefined;
    } | {
        transport: "http";
        installed: boolean;
        url: string;
        headers: Record<string, string>;
        description?: string | undefined;
        oauth?: {
            grant_type: "authorization_code" | "client_credentials";
            client_id?: string | undefined;
            client_secret?: string | undefined;
            scope?: string | undefined;
        } | undefined;
    }>;
}, {
    version: "1";
    bin_dir?: string | undefined;
    servers?: Record<string, {
        transport: "stdio";
        command: string;
        args?: string[] | undefined;
        env?: Record<string, string> | undefined;
        installed?: boolean | undefined;
        description?: string | undefined;
    } | {
        transport: "http";
        url: string;
        installed?: boolean | undefined;
        description?: string | undefined;
        headers?: Record<string, string> | undefined;
        oauth?: {
            grant_type?: "authorization_code" | "client_credentials" | undefined;
            client_id?: string | undefined;
            client_secret?: string | undefined;
            scope?: string | undefined;
        } | undefined;
    }> | undefined;
}>;
export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
export type StdioServerConfig = z.infer<typeof StdioServerConfigSchema>;
export type HttpServerConfig = z.infer<typeof HttpServerConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type GashaponConfig = z.infer<typeof GashaponConfigSchema>;
export declare const DEFAULT_CONFIG: GashaponConfig;
