import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import { ClientCredentialsProvider } from '@modelcontextprotocol/sdk/client/auth-extensions.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { interpolateEnv } from '../util/env.js';
import { CliOAuthProvider, findFreePort } from '../auth/provider.js';
import { FileTokenStore } from '../auth/token-store.js';
import { notFound, usageError } from '../output/errors.js';
import { buildReceipt } from '../output/receipt.js';
export default class Auth extends BaseCommand {
    static description = 'Authenticate with an HTTP MCP server using OAuth';
    static examples = [
        '<%= config.bin %> auth github',
        '<%= config.bin %> auth myserver --force',
    ];
    static args = {
        name: Args.string({ description: 'Server name', required: true }),
    };
    static flags = {
        ...BaseCommand.baseFlags,
        force: Flags.boolean({
            summary: 'Re-authenticate even if tokens already exist',
            default: false,
        }),
    };
    async run() {
        const { args, flags } = await this.parse(Auth);
        const { name } = args;
        const serverConfig = await this.configManager.getServer(name);
        if (!serverConfig)
            throw notFound(`Server "${name}"`, ['Run `gashapon list` to see available servers']);
        if (serverConfig.transport !== 'http') {
            throw usageError(`Server "${name}" uses stdio transport — OAuth only applies to HTTP servers`);
        }
        // oauth config is optional — if absent, use dynamic discovery + dynamic client registration
        const oauthConfig = {
            grant_type: serverConfig.oauth?.grant_type ?? 'authorization_code',
            client_id: serverConfig.oauth?.client_id,
            client_secret: serverConfig.oauth?.client_secret
                ? interpolateEnv(serverConfig.oauth.client_secret)
                : undefined,
            scope: serverConfig.oauth?.scope,
        };
        const store = new FileTokenStore(name);
        if (flags.force)
            await store.clear();
        const serverUrl = new URL(serverConfig.url);
        // --- Client Credentials (non-interactive) ---
        if (oauthConfig.grant_type === 'client_credentials') {
            if (!oauthConfig.client_id || !oauthConfig.client_secret) {
                throw usageError('client_credentials grant requires both client_id and client_secret');
            }
            process.stderr.write(`Obtaining client_credentials token for "${name}"...\n`);
            const provider = new ClientCredentialsProvider({
                clientId: oauthConfig.client_id,
                clientSecret: oauthConfig.client_secret,
                scope: oauthConfig.scope,
            });
            const result = await auth(provider, { serverUrl });
            // ClientCredentialsProvider stores tokens in-memory; persist them ourselves
            const tokens = provider.tokens();
            if (tokens)
                await store.saveTokens(tokens);
            if (result === 'AUTHORIZED') {
                this.outputData(buildReceipt('auth', name));
            }
            else {
                throw new Error('Unexpected auth result for client_credentials flow');
            }
            return;
        }
        // --- Authorization Code + PKCE (interactive) ---
        const port = serverConfig.oauth?.callback_port ?? await findFreePort();
        const provider = new CliOAuthProvider(store, oauthConfig, port);
        await provider.startServer();
        process.stderr.write(`Listening for OAuth callback on http://localhost:${port}/callback\n`);
        try {
            // Phase 1: start auth flow — calls redirectToAuthorization() and returns 'REDIRECT'
            const transport = new StreamableHTTPClientTransport(serverUrl, { authProvider: provider });
            const result = await auth(provider, { serverUrl });
            if (result === 'AUTHORIZED') {
                // Tokens were already valid (e.g. refresh succeeded)
                process.stderr.write(`Already authorized (tokens valid or refreshed).\n`);
                this.outputData(buildReceipt('auth', name));
                return;
            }
            // result === 'REDIRECT': browser was opened, wait for code
            process.stderr.write(`Waiting for authorization code...\n`);
            const code = await provider.waitForCode();
            // Phase 2: exchange code for tokens
            await transport.finishAuth(code);
            this.outputData(buildReceipt('auth', name));
        }
        finally {
            provider.stopServer();
        }
    }
}
