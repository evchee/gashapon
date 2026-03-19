import os from 'node:os';
import path from 'node:path';
function expandHome(p) {
    if (p.startsWith('~/') || p === '~') {
        return path.join(os.homedir(), p.slice(2));
    }
    return p;
}
function resolve(p) {
    return path.resolve(expandHome(p));
}
export function configDir() {
    const xdg = process.env.XDG_CONFIG_HOME;
    const base = xdg && path.isAbsolute(xdg) ? xdg : path.join(os.homedir(), '.config');
    return resolve(path.join(base, 'gashapon'));
}
export function configPath() {
    return path.join(configDir(), 'config.json');
}
export function cacheDir() {
    const xdg = process.env.XDG_CACHE_HOME;
    const base = xdg && path.isAbsolute(xdg) ? xdg : path.join(os.homedir(), '.cache');
    return resolve(path.join(base, 'gashapon'));
}
export function serverCacheDir(serverName) {
    return path.join(cacheDir(), serverName);
}
export function binDir(config) {
    return resolve(config.bin_dir);
}
/** Path to stored OAuth tokens for a server: ~/.config/gashapon/tokens/<name>.json */
export function tokenPath(serverName) {
    return path.join(configDir(), 'tokens', `${serverName}.json`);
}
export function completionsDir() {
    return path.join(resolve('~/.gashapon'), 'completions');
}
/** The bin name for a server's generated wrapper, e.g. "slack" → "slack_capsule" */
export function wrapperName(serverName) {
    return `${serverName}_capsule`;
}
