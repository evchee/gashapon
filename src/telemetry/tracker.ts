import fs from 'node:fs/promises'
import path from 'node:path'
import { cacheDir } from '../config/paths.js'

interface TelemetryEvent {
  timestamp: string
  server: string
  command: string
  exitCode: number
  durationMs: number
  correlationId?: string
}

export async function trackEvent(event: TelemetryEvent): Promise<void> {
  if (!process.env.CAPSULE_TELEMETRY) return
  const logPath = path.join(cacheDir(), 'telemetry.jsonl')
  const line = JSON.stringify(event) + '\n'
  try {
    await fs.mkdir(path.dirname(logPath), { recursive: true })
    await fs.appendFile(logPath, line, 'utf8')
  } catch { /* best effort */ }
}
