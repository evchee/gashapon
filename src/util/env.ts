/**
 * Interpolates ${VAR} references in a string using process.env.
 * Throws if a referenced variable is not set.
 */
export function interpolateEnv(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    const val = process.env[varName]
    if (val === undefined) {
      throw new Error(`Environment variable ${varName} is not set (referenced as ${match})`)
    }
    return val
  })
}

/**
 * Interpolates all values in a Record<string, string>.
 */
export function interpolateEnvMap(
  record: Record<string, string> | undefined,
): Record<string, string> {
  if (!record) return {}
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(record)) {
    try {
      result[key] = interpolateEnv(value)
    } catch {
      result[key] = value // pass through if can't resolve — let runtime fail
    }
  }
  return result
}
