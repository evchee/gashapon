import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { wrapperName } from '../config/paths.js';
/**
 * Resolve the absolute path to the gashapon binary.
 * Uses process.argv[0] (the node binary), but the actual gashapon script
 * is process.argv[1] when running as a bin script.
 * Falls back to `which gashapon`.
 */
function resolveGashaponBin() {
    // When running as installed bin, process.argv[1] is the gashapon bin script
    if (process.argv[1] && process.argv[1].includes('gashapon')) {
        return path.resolve(process.argv[1]);
    }
    // Try which
    try {
        const result = execSync('which gashapon', { encoding: 'utf8' }).trim();
        if (result)
            return result;
    }
    catch { /* fall through */ }
    // Fallback to 'gashapon' and hope it's on PATH
    return 'gashapon';
}
/** Wrap a path in single-quotes for use in a POSIX sh script, escaping any embedded single-quotes. */
function shSingleQuote(s) {
    return "'" + s.replace(/'/g, "'\\''") + "'";
}
export async function generateWrapper(binDir, serverName) {
    await fs.mkdir(binDir, { recursive: true });
    const gashaponBin = resolveGashaponBin();
    const wrapperPath = path.join(binDir, wrapperName(serverName));
    const content = `#!/bin/sh\nexec ${shSingleQuote(gashaponBin)} exec ${serverName} "$@"\n`;
    await fs.writeFile(wrapperPath, content, { mode: 0o755 });
}
export async function removeWrapper(binDir, serverName) {
    const wrapperPath = path.join(binDir, wrapperName(serverName));
    await fs.unlink(wrapperPath);
}
