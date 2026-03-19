import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

/**
 * Resolve the absolute path to the capsule binary.
 * Uses process.argv[0] (the node binary), but the actual capsule script
 * is process.argv[1] when running as a bin script.
 * Falls back to `which capsule`.
 */
function resolveCapsuleBin(): string {
  // When running as installed bin, process.argv[1] is the capsule bin script
  if (process.argv[1] && process.argv[1].includes('capsule')) {
    return path.resolve(process.argv[1])
  }
  // Try which
  try {
    const result = execSync('which capsule', { encoding: 'utf8' }).trim()
    if (result) return result
  } catch { /* fall through */ }
  // Fallback to 'capsule' and hope it's on PATH
  return 'capsule'
}

export async function generateWrapper(binDir: string, serverName: string): Promise<void> {
  await fs.mkdir(binDir, { recursive: true })
  const capsuleBin = resolveCapsuleBin()
  const wrapperPath = path.join(binDir, serverName)
  const content = `#!/bin/sh\nexec ${capsuleBin} exec ${serverName} "$@"\n`
  await fs.writeFile(wrapperPath, content, { mode: 0o755 })
}

export async function removeWrapper(binDir: string, serverName: string): Promise<void> {
  const wrapperPath = path.join(binDir, serverName)
  await fs.unlink(wrapperPath)
}
