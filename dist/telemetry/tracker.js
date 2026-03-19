import fs from 'node:fs/promises';
import path from 'node:path';
import { cacheDir } from '../config/paths.js';
export async function trackEvent(event) {
    if (!process.env.GASHAPON_TELEMETRY)
        return;
    const logPath = path.join(cacheDir(), 'telemetry.jsonl');
    const line = JSON.stringify(event) + '\n';
    try {
        await fs.mkdir(path.dirname(logPath), { recursive: true });
        await fs.appendFile(logPath, line, 'utf8');
    }
    catch { /* best effort */ }
}
