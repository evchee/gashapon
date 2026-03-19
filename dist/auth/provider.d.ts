import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthClientProvider, OAuthDiscoveryState } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthConfig } from '../config/schema.js';
import type { FileTokenStore } from './token-store.js';
/**
 * OAuthClientProvider for the authorization_code + PKCE flow.
 * Stores tokens/verifier/discovery state to disk, opens a local HTTP server
 * to catch the redirect, and launches the user's browser.
 */
export declare class CliOAuthProvider implements OAuthClientProvider {
    private readonly store;
    private readonly oauthConfig;
    private readonly _port;
    private _server?;
    private _codeResolve?;
    private _codeReject?;
    private _codePromise?;
    constructor(store: FileTokenStore, oauthConfig: OAuthConfig, port: number);
    get redirectUrl(): string;
    get clientMetadata(): OAuthClientMetadata;
    clientInformation(): Promise<OAuthClientInformationMixed | undefined>;
    saveClientInformation(info: OAuthClientInformationMixed): Promise<void>;
    tokens(): Promise<OAuthTokens | undefined>;
    saveTokens(tokens: OAuthTokens): Promise<void>;
    redirectToAuthorization(authorizationUrl: URL): Promise<void>;
    saveCodeVerifier(codeVerifier: string): Promise<void>;
    codeVerifier(): Promise<string>;
    discoveryState(): Promise<OAuthDiscoveryState | undefined>;
    saveDiscoveryState(state: OAuthDiscoveryState): Promise<void>;
    invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery'): Promise<void>;
    /** Start the local callback server. Call before initiating auth flow. */
    startServer(): Promise<void>;
    /** Resolves with the authorization code when the user completes the flow. */
    waitForCode(): Promise<string>;
    stopServer(): void;
}
/** Find a free TCP port on localhost. */
export declare function findFreePort(): Promise<number>;
