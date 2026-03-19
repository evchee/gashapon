import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ClientCredentialsProvider } from '@modelcontextprotocol/sdk/client/auth-extensions.js';
import { interpolateEnv, interpolateEnvMap } from '../util/env.js';
import { CliOAuthProvider, findFreePort } from '../auth/provider.js';
import { FileTokenStore } from '../auth/token-store.js';
export async function createTransport(serverName, serverConfig) {
    if (serverConfig.transport === 'stdio') {
        return new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args ?? [],
            env: {
                ...process.env,
                ...interpolateEnvMap(serverConfig.env),
            },
        });
    }
    // HTTP transport — determine auth provider
    const headers = interpolateEnvMap(serverConfig.headers);
    let authProvider;
    if (serverConfig.oauth) {
        const oauthConfig = {
            ...serverConfig.oauth,
            client_secret: serverConfig.oauth.client_secret
                ? interpolateEnv(serverConfig.oauth.client_secret)
                : undefined,
        };
        if (oauthConfig.grant_type === 'client_credentials') {
            if (!oauthConfig.client_id || !oauthConfig.client_secret) {
                throw new Error(`Server "${serverName}": client_credentials requires client_id and client_secret`);
            }
            authProvider = new ClientCredentialsProvider({
                clientId: oauthConfig.client_id,
                clientSecret: oauthConfig.client_secret,
                scope: oauthConfig.scope,
            });
        }
        else {
            // authorization_code: use file-backed provider with stored tokens
            const store = new FileTokenStore(serverName);
            const port = oauthConfig.callback_port ?? await findFreePort();
            authProvider = new CliOAuthProvider(store, oauthConfig, port);
        }
    }
    return new StreamableHTTPClientTransport(new URL(serverConfig.url), {
        requestInit: Object.keys(headers).length > 0 ? { headers } : undefined,
        authProvider,
    });
}
